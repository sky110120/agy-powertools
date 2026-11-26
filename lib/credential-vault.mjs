import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendWslEnv, isWslEnvironment, wslDistroName } from './wsl.mjs';

export const ACTIVE_TARGET = 'gemini:antigravity';
export const ACTIVE_USERNAME = 'antigravity';
export const ACTIVE_SERVICE = 'gemini';
export const VAULT_SERVICE = 'agy-powertools-account';

const ACCOUNT_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const CRED_EMAIL_RE = /^[^\s@"\\]+@[^\s@"\\]+\.[^\s@"\\]+$/;

function normalizeEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  return CRED_EMAIL_RE.test(value) ? value : '';
}

export function extractCredentialEmail(bufferOrText) {
  if (!bufferOrText) return '';
  try {
    const text = Buffer.isBuffer(bufferOrText) ? bufferOrText.toString('utf8') : String(bufferOrText);
    const trimmed = text.trim();
    if (!trimmed.startsWith('{')) return '';
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      const direct = normalizeEmail(parsed.id_token_email);
      if (direct) return direct;
      if (typeof parsed.token === 'string' && parsed.token) {
        const inner = Buffer.from(parsed.token, 'base64');
        try {
          return extractCredentialEmail(inner);
        } finally {
          inner.fill(0);
        }
      }
    }
  } catch {}
  return '';
}

function mismatchResult(actualEmail, expectedEmail) {
  return {
    ok: false,
    mismatch: true,
    actualEmail,
    expectedEmail,
    error: `当前系统凭据属于 ${actualEmail}，与目标账号 ${expectedEmail} 不一致，已跳过写入以防凭据串号`
  };
}

export function vaultTargetFor(accountId, { wslDistro = '' } = {}) {
  const id = String(accountId || '').trim();
  if (!ACCOUNT_ID_RE.test(id)) throw new Error('账号标识无效');
  const distro = String(wslDistro || '').trim().replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 48);
  return distro ? `agy-powertools:wsl:${distro}:account:${id}` : `agy-powertools:account:${id}`;
}

function splitPosixTarget(target) {
  if (target === ACTIVE_TARGET) return { service: ACTIVE_SERVICE, account: ACTIVE_USERNAME };
  const prefix = 'agy-powertools:account:';
  if (target.startsWith(prefix)) {
    const account = target.slice(prefix.length);
    if (!ACCOUNT_ID_RE.test(account)) throw new Error('账号标识无效');
    return { service: VAULT_SERVICE, account };
  }
  throw new Error('不支持的凭据目标');
}

function shortHash(buffer) {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 12).toUpperCase();
}

const WIN32_SCRIPT = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Security.Cryptography;

public static class AgyWinCred {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public uint Flags;
    public uint Type;
    public string TargetName;
    public string Comment;
    public long LastWritten;
    public uint CredentialBlobSize;
    public IntPtr CredentialBlob;
    public uint Persist;
    public uint AttributeCount;
    public IntPtr Attributes;
    public string TargetAlias;
    public string UserName;
  }

  [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool CredReadW(string target, uint type, int reservedFlag, out IntPtr credentialPtr);

  [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool CredWriteW([In] ref CREDENTIAL userCredential, uint flags);

  [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool CredDeleteW(string target, uint type, int flags);

  [DllImport("advapi32.dll")]
  public static extern void CredFree(IntPtr cred);

  public static string ShortHash(byte[] bytes) {
    using (var sha = SHA256.Create()) {
      return BitConverter.ToString(sha.ComputeHash(bytes)).Replace("-", "").Substring(0, 12);
    }
  }

  private static string FindJsonStringField(string text, string key) {
    if (string.IsNullOrEmpty(text)) return "";
    string needle = "\\"" + key + "\\"";
    int start = 0;
    while (start < text.Length) {
      int idx = text.IndexOf(needle, start, StringComparison.Ordinal);
      if (idx < 0) return "";
      start = idx + needle.Length;
      if (idx > 0 && text[idx - 1] == '\\\\') continue;
      int p = start;
      while (p < text.Length && (text[p] == ' ' || text[p] == '\\t' || text[p] == '\\r' || text[p] == '\\n')) p++;
      if (p >= text.Length || text[p] != ':') continue;
      p++;
      while (p < text.Length && (text[p] == ' ' || text[p] == '\\t' || text[p] == '\\r' || text[p] == '\\n')) p++;
      if (p >= text.Length || text[p] != '"') continue;
      int q2 = p + 1;
      while (q2 < text.Length) {
        if (text[q2] == '\\\\') { q2 += 2; continue; }
        if (text[q2] == '"') break;
        q2++;
      }
      if (q2 < text.Length && q2 > p + 1 && text[q2] == '"') {
        return text.Substring(p + 1, q2 - p - 1).Trim();
      }
      start = Math.Min(q2 + 1, text.Length);
    }
    return "";
  }

  private static bool IsSafeEmail(string value) {
    if (string.IsNullOrEmpty(value) || value.Length > 254) return false;
    int at = value.IndexOf('@');
    if (at <= 0 || at != value.LastIndexOf('@')) return false;
    int dot = value.IndexOf('.', at + 2);
    if (dot < 0 || dot >= value.Length - 1) return false;
    for (int i = 0; i < value.Length; i++) {
      char ch = value[i];
      if (ch <= 32 || ch >= 127 || ch == '"' || ch == '\\\\') return false;
    }
    return true;
  }

  public static string ExtractEmail(byte[] bytes) {
    if (bytes == null || bytes.Length == 0) return "";
    try {
      string text = System.Text.Encoding.UTF8.GetString(bytes);
      string direct = FindJsonStringField(text, "id_token_email");
      if (IsSafeEmail(direct)) return direct.ToLowerInvariant();
      string b64 = FindJsonStringField(text, "token");
      if (!string.IsNullOrEmpty(b64)) {
        byte[] inner = Convert.FromBase64String(b64);
        try {
          string innerDirect = FindJsonStringField(System.Text.Encoding.UTF8.GetString(inner), "id_token_email");
          if (IsSafeEmail(innerDirect)) return innerDirect.ToLowerInvariant();
        } finally {
          Array.Clear(inner, 0, inner.Length);
        }
      }
    } catch {}
    return "";
  }
}
"@
$op = $env:AGY_CRED_OP
$src = $env:AGY_CRED_SRC
$dst = $env:AGY_CRED_DST
$dstUser = $env:AGY_CRED_USER
$expectedEmail = if ([string]::IsNullOrEmpty($env:AGY_CRED_EXPECTED_EMAIL)) { '' } else { $env:AGY_CRED_EXPECTED_EMAIL.Trim().ToLowerInvariant() }
if ($op -eq 'has' -or $op -eq 'inspect') {
  $ptr = [IntPtr]::Zero
  if ([AgyWinCred]::CredReadW($src, 1, 0, [ref]$ptr)) {
    [byte[]]$bytes = $null
    try {
      $c = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [Type][AgyWinCred+CREDENTIAL])
      $size = [int]$c.CredentialBlobSize
      $bytes = New-Object byte[] $size
      if ($size -gt 0 -and $c.CredentialBlob -ne [IntPtr]::Zero) {
        [System.Runtime.InteropServices.Marshal]::Copy($c.CredentialBlob, $bytes, 0, $size)
      }
      $hash = [AgyWinCred]::ShortHash($bytes)
      $email = [AgyWinCred]::ExtractEmail($bytes)
      $emailPart = if ([string]::IsNullOrEmpty($email)) { '' } else { ',"email":"' + $email + '"' }
      Write-Output ('{"ok":true,"exists":true,"bytes":' + $size + ',"hash":"' + $hash + '"' + $emailPart + '}')
    } finally {
      if ($bytes -ne $null) { [Array]::Clear($bytes, 0, $bytes.Length) }
      [AgyWinCred]::CredFree($ptr)
    }
  } else {
    Write-Output '{"ok":true,"exists":false,"hash":""}'
  }
} elseif ($op -eq 'copy') {
  $ptr = [IntPtr]::Zero
  if (-not [AgyWinCred]::CredReadW($src, 1, 0, [ref]$ptr)) {
    $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
    Write-Output ('{"ok":false,"error":"read failed: ' + $err + '"}')
    exit 1
  }
  $blobCopy = [IntPtr]::Zero
  [byte[]]$bytes = $null
  try {
    $c = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [Type][AgyWinCred+CREDENTIAL])
    $size = [int]$c.CredentialBlobSize
    $bytes = New-Object byte[] $size
    if ($size -gt 0 -and $c.CredentialBlob -ne [IntPtr]::Zero) {
      [System.Runtime.InteropServices.Marshal]::Copy($c.CredentialBlob, $bytes, 0, $size)
    }
    $email = [AgyWinCred]::ExtractEmail($bytes)
    if (-not [string]::IsNullOrEmpty($expectedEmail) -and -not [string]::IsNullOrEmpty($email) -and $email -ne $expectedEmail) {
      Write-Output ('{"ok":false,"mismatch":true,"actualEmail":"' + $email + '","expectedEmail":"' + $expectedEmail + '","error":"credential email mismatch"}')
      exit 1
    }
    if ($size -gt 0) {
      $blobCopy = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($size)
      [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $blobCopy, $size)
    }
    $hash = [AgyWinCred]::ShortHash($bytes)
    $next = New-Object AgyWinCred+CREDENTIAL
    $next.Flags = 0
    $next.Type = 1
    $next.TargetName = $dst
    $next.Comment = $c.Comment
    $next.CredentialBlobSize = [uint32]$size
    $next.CredentialBlob = $blobCopy
    $next.Persist = if ($c.Persist -ne 0) { $c.Persist } else { 2 }
    $next.AttributeCount = 0
    $next.Attributes = [IntPtr]::Zero
    $next.TargetAlias = $null
    $next.UserName = if ([string]::IsNullOrEmpty($dstUser)) { $c.UserName } else { $dstUser }
    if (-not [AgyWinCred]::CredWriteW([ref]$next, 0)) {
      $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
      Write-Output ('{"ok":false,"error":"write failed: ' + $err + '"}')
      exit 1
    }
    $emailPart = if ([string]::IsNullOrEmpty($email)) { '' } else { ',"email":"' + $email + '"' }
    Write-Output ('{"ok":true,"bytes":' + $size + ',"hash":"' + $hash + '"' + $emailPart + '}')
  } finally {
    if ($bytes -ne $null) { [Array]::Clear($bytes, 0, $bytes.Length) }
    if ($blobCopy -ne [IntPtr]::Zero) { [System.Runtime.InteropServices.Marshal]::FreeHGlobal($blobCopy) }
    if ($ptr -ne [IntPtr]::Zero) { [AgyWinCred]::CredFree($ptr) }
  }
} elseif ($op -eq 'probe') {
  Write-Output '{"ok":true}'
} elseif ($op -eq 'read') {
  $ptr = [IntPtr]::Zero
  if ([AgyWinCred]::CredReadW($src, 1, 0, [ref]$ptr)) {
    [byte[]]$bytes = $null
    try {
      $c = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [Type][AgyWinCred+CREDENTIAL])
      $size = [int]$c.CredentialBlobSize
      $bytes = New-Object byte[] $size
      if ($size -gt 0 -and $c.CredentialBlob -ne [IntPtr]::Zero) {
        [System.Runtime.InteropServices.Marshal]::Copy($c.CredentialBlob, $bytes, 0, $size)
      }
      $hash = [AgyWinCred]::ShortHash($bytes)
      $b64 = [Convert]::ToBase64String($bytes)
      Write-Output ('{"ok":true,"exists":true,"bytes":' + $size + ',"hash":"' + $hash + '","data":"' + $b64 + '"}')
    } finally {
      if ($bytes -ne $null) { [Array]::Clear($bytes, 0, $bytes.Length) }
      if ($ptr -ne [IntPtr]::Zero) { [AgyWinCred]::CredFree($ptr) }
    }
  } else {
    Write-Output '{"ok":true,"exists":false,"hash":"","data":""}'
  }
} elseif ($op -eq 'write') {
  $raw = [Console]::In.ReadToEnd().Trim()
  if ([string]::IsNullOrEmpty($raw)) {
    Write-Output '{"ok":false,"error":"empty payload"}'
    exit 1
  }
  [byte[]]$bytes = $null
  $blobCopy = [IntPtr]::Zero
  try {
    $bytes = [Convert]::FromBase64String($raw)
    $size = $bytes.Length
    if ($size -gt 0) {
      $blobCopy = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($size)
      [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $blobCopy, $size)
    }
    $hash = [AgyWinCred]::ShortHash($bytes)
    $next = New-Object AgyWinCred+CREDENTIAL
    $next.Flags = 0
    $next.Type = 1
    $next.TargetName = $dst
    $next.Comment = 'Agy Powertools WSL account backup'
    $next.CredentialBlobSize = [uint32]$size
    $next.CredentialBlob = $blobCopy
    $next.Persist = 2
    $next.AttributeCount = 0
    $next.Attributes = [IntPtr]::Zero
    $next.TargetAlias = $null
    $next.UserName = if ([string]::IsNullOrEmpty($dstUser)) { 'antigravity' } else { $dstUser }
    if (-not [AgyWinCred]::CredWriteW([ref]$next, 0)) {
      $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
      Write-Output ('{"ok":false,"error":"write failed: ' + $err + '"}')
      exit 1
    }
    Write-Output ('{"ok":true,"bytes":' + $size + ',"hash":"' + $hash + '"}')
  } finally {
    if ($bytes -ne $null) { [Array]::Clear($bytes, 0, $bytes.Length) }
    if ($blobCopy -ne [IntPtr]::Zero) { [System.Runtime.InteropServices.Marshal]::FreeHGlobal($blobCopy) }
  }
} elseif ($op -eq 'remove') {
  $ok = [AgyWinCred]::CredDeleteW($src, 1, 0)
  if (-not $ok) {
    $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
    if ($err -ne 1168) {
      Write-Output ('{"ok":false,"error":"delete failed: ' + $err + '"}')
      exit 1
    }
  }
  Write-Output '{"ok":true}'
} else {
  Write-Output '{"ok":false,"error":"unknown op"}'
  exit 1
}
`;

function atomicWriteSecure(filePath, buffer) {
  mkdirSync(dirname(filePath), { recursive: true, mode: 0o700 });
  const tmpPath = `${filePath}.tmp.${process.pid}`;
  writeFileSync(tmpPath, buffer, { mode: 0o600 });
  try { chmodSync(tmpPath, 0o600); } catch {}
  renameSync(tmpPath, filePath);
}

export function buildMacKeychainReadScript({ service, account }) {
  return [
    "ObjC.import('Foundation');",
    "ObjC.import('Security');",
    "ObjC.import('stdlib');",
    "let step = 'init';",
    'try {',
    "  if (typeof ObjC.bindFunction === 'function') {",
    "    ObjC.bindFunction('SecKeychainSetUserInteractionAllowed', ['int', ['bool']]);",
    "    ObjC.bindFunction('SecItemCopyMatching', ['int', ['id', 'id*']]);",
    '  }',
    "  if (typeof $.SecKeychainSetUserInteractionAllowed === 'function') $.SecKeychainSetUserInteractionAllowed(false);",
    "  const isRef = v => Boolean(v) && (Object.prototype.toString.call(v) === '[object Ref]' || String(v) === '[object Ref]');",
    "  const toObj = v => (isRef(v) && typeof ObjC.castRefToObject === 'function' ? ObjC.castRefToObject(v) : v);",
    `  const service = $(${JSON.stringify(String(service || ''))});`,
    `  const account = $(${JSON.stringify(String(account || ''))});`,
    "  const kClass = toObj($.kSecClass) || $('class');",
    "  const kGenp = toObj($.kSecClassGenericPassword) || $('genp');",
    "  const kSvc = toObj($.kSecAttrService) || $('svce');",
    "  const kAcct = toObj($.kSecAttrAccount) || $('acct');",
    "  const kRetData = toObj($.kSecReturnData) || $('r_Data');",
    "  const kMatchLimit = toObj($.kSecMatchLimit) || $('m_Limit');",
    "  const kMatchOne = toObj($.kSecMatchLimitOne) || $('m_LimitOne');",
    '  const query = $.NSMutableDictionary.alloc.init;',
    '  query.setObjectForKey(kGenp, kClass);',
    '  query.setObjectForKey(service, kSvc);',
    '  query.setObjectForKey(account, kAcct);',
    '  query.setObjectForKey($.NSNumber.numberWithBool(true), kRetData);',
    '  query.setObjectForKey(kMatchOne, kMatchLimit);',
    "  step = 'copy-matching';",
    '  const outRef = Ref();',
    '  const status = $.SecItemCopyMatching(query, outRef);',
    '  if (status !== 0) { console.log(step + " OSStatus " + status); $.exit(1); }',
    '  const dataObj = toObj(outRef[0]);',
    '  if (!dataObj || (typeof dataObj.isNil === \'function\' && dataObj.isNil())) { console.log("empty data"); $.exit(1); }',
    '  const b64 = ObjC.unwrap(dataObj.base64EncodedStringWithOptions(0));',
    '  const outData = $(b64 + "\\n").dataUsingEncoding($.NSUTF8StringEncoding);',
    '  $.NSFileHandle.fileHandleWithStandardOutput.writeData(outData);',
    '} catch (e) {',
    '  console.log(step + " exception: " + e);',
    '  $.exit(1);',
    '}'
  ].join('\n') + '\n';
}

export function buildMacKeychainWriteScript({ service, account, dataBase64 }) {
  return [
    "ObjC.import('Foundation');",
    "ObjC.import('Security');",
    "ObjC.import('stdlib');",
    "let step = 'init';",
    'try {',
    "  if (typeof ObjC.bindFunction === 'function') {",
    "    ObjC.bindFunction('SecItemUpdate', ['int', ['id', 'id']]);",
    "    ObjC.bindFunction('SecItemAdd', ['int', ['id', 'void*']]);",
    "    ObjC.bindFunction('SecTrustedApplicationCreateFromPath', ['int', ['string', 'id*']]);",
    "    ObjC.bindFunction('SecAccessCreate', ['int', ['id', 'id', 'id*']]);",
    "    ObjC.bindFunction('SecAccessCopyMatchingACLList', ['id', ['id', 'id']]);",
    "    ObjC.bindFunction('SecACLSetContents', ['int', ['id', 'void*', 'id', 'int']]);",
    "    ObjC.bindFunction('SecACLCreateWithSimpleContents', ['int', ['id', 'void*', 'id', 'int', 'id*']]);",
    "    ObjC.bindFunction('SecACLUpdateAuthorizations', ['int', ['id', 'id']]);",
    "    ObjC.bindFunction('SecCopyErrorMessageString', ['id', ['int', 'void*']]);",
    '  }',
    "  const isRef = v => Boolean(v) && (Object.prototype.toString.call(v) === '[object Ref]' || String(v) === '[object Ref]');",
    "  const toObj = v => (isRef(v) && typeof ObjC.castRefToObject === 'function' ? ObjC.castRefToObject(v) : v);",
    `  const service = $(${JSON.stringify(String(service || ''))});`,
    `  const account = $(${JSON.stringify(String(account || ''))});`,
    `  const data = $.NSData.alloc.initWithBase64EncodedStringOptions($(${JSON.stringify(String(dataBase64 || ''))}), 0);`,
    '  if (!data || data.isNil()) { console.log("invalid base64 payload"); $.exit(1); }',
    "  step = 'constants';",
    "  const kClass = toObj($.kSecClass) || $('class');",
    "  const kGenp = toObj($.kSecClassGenericPassword) || $('genp');",
    "  const kSvc = toObj($.kSecAttrService) || $('svce');",
    "  const kAcct = toObj($.kSecAttrAccount) || $('acct');",
    "  const kVal = toObj($.kSecValueData) || $('v_Data');",
    '  const kAccess = toObj($.kSecAttrAccess);',
    '  const query = $.NSMutableDictionary.alloc.init;',
    '  query.setObjectForKey(kGenp, kClass);',
    '  query.setObjectForKey(service, kSvc);',
    '  query.setObjectForKey(account, kAcct);',
    '  const attrs = $.NSMutableDictionary.alloc.init;',
    '  attrs.setObjectForKey(data, kVal);',
    "  step = 'update';",
    '  let status = $.SecItemUpdate(query, attrs);',
    '  if (status === -25300) {',
    '    const addQuery = query.mutableCopy;',
    '    addQuery.setObjectForKey(data, kVal);',
    '    const list = $.NSMutableArray.alloc.init;',
    "    for (const path of ['/usr/bin/osascript', '/usr/bin/security']) {",
    "      step = path === '/usr/bin/security' ? 'trusted-security' : 'trusted-self';",
    '      const app = Ref();',
    '      status = $.SecTrustedApplicationCreateFromPath(path, app);',
    '      if (status !== 0) break;',
    '      list.addObject(toObj(app[0]));',
    '    }',
    '    if (status === 0) {',
    "      step = 'access';",
    '      const access = Ref();',
    '      status = $.SecAccessCreate(service, list, access);',
    '      if (status === 0) {',
    '        const accessObj = toObj(access[0]);',
    "        const kPart = toObj($.kSecACLAuthorizationPartitionID) || $('ACLAuthorizationPartitionID');",
    '        const partitionXml = $(\'<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Partitions</key><array><string>apple-tool:</string><string>apple:</string><string>teamid:EQHXZ8M8AV</string></array></dict></plist>\');',
    '        const existingAcls = $.SecAccessCopyMatchingACLList(accessObj, kPart);',
    '        if (existingAcls && (!existingAcls.isNil || !existingAcls.isNil()) && existingAcls.count > 0) {',
    "          step = 'partition-update';",
    '          status = $.SecACLSetContents(existingAcls.objectAtIndex(0), null, partitionXml, 0);',
    '        } else {',
    "          step = 'partition-create';",
    '          const aclRef = Ref();',
    '          status = $.SecACLCreateWithSimpleContents(accessObj, null, partitionXml, 0, aclRef);',
    '          if (status === 0) {',
    "            step = 'partition-auth';",
    '            const auths = $.NSMutableArray.alloc.init;',
    '            auths.addObject(kPart);',
    '            status = $.SecACLUpdateAuthorizations(toObj(aclRef[0]), auths);',
    '          }',
    '        }',
    '        if (status === 0) {',
    '          if (!kAccess) { status = -50; }',
    '          else {',
    "            step = 'add';",
    '            addQuery.setObjectForKey(accessObj, kAccess);',
    '            status = $.SecItemAdd(addQuery, null);',
    "            if (status === -25299) { step = 'update-after-dup'; status = $.SecItemUpdate(query, attrs); }",
    '          }',
    '        }',
    '      }',
    '    }',
    '  }',
    '  if (status !== 0) {',
    "    const errRef = typeof $.SecCopyErrorMessageString === 'function' ? $.SecCopyErrorMessageString(status, null) : null;",
    '    const errObj = errRef ? toObj(errRef) : null;',
    "    const msg = errObj ? (typeof ObjC.unwrap === 'function' ? ObjC.unwrap(errObj) : String(errObj)) : '';",
    '    console.log(step + " OSStatus " + status + (msg ? ": " + msg : ""));',
    '    $.exit(1);',
    '  }',
    '} catch (e) {',
    '  console.log(step + " exception: " + e);',
    '  $.exit(1);',
    '}'
  ].join('\n') + '\n';
}

export function createCredentialVault({
  platform = process.platform,
  env = process.env,
  home = homedir(),
  wsl,
  wslDistro,
  runSpawn = spawnSync
} = {}) {
  const wslMode = typeof wsl === 'boolean' ? wsl : isWslEnvironment({ platform, env });
  const distro = wslMode ? (wslDistro || wslDistroName({ env })) : '';
  const supported = platform === 'win32' || platform === 'darwin' || platform === 'linux';
  const backend = platform === 'win32'
    ? 'win32-credman'
    : platform === 'darwin'
      ? 'darwin-keychain'
      : wslMode
        ? 'wsl-wincred'
        : platform === 'linux'
          ? 'linux-secret-service'
          : 'unsupported';

  const wslActiveTokenPath = join(home, '.gemini', 'jetski-standalone-oauth-token');
  const wslActiveScopePath = join(env?.XDG_CONFIG_HOME || join(home, '.config'), 'antigravity', 'credential-user-scope');
  let probeCache = null;

  function runWin32(op, src, dst = '', userName = '', input = undefined, expectedEmail = '') {
    const normalizedExpected = normalizeEmail(expectedEmail);
    const baseEnv = {
      ...env,
      AGY_CRED_OP: op,
      AGY_CRED_SRC: src,
      AGY_CRED_DST: dst,
      AGY_CRED_USER: userName,
      AGY_CRED_EXPECTED_EMAIL: normalizedExpected
    };
    const wslKeys = ['AGY_CRED_OP', 'AGY_CRED_SRC', 'AGY_CRED_DST', 'AGY_CRED_USER', 'AGY_CRED_EXPECTED_EMAIL'];
    const finalEnv = wslMode
      ? appendWslEnv(baseEnv, wslKeys)
      : baseEnv;
    const opts = {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 12000,
      env: finalEnv
    };
    if (input !== undefined) {
      opts.input = input;
      opts.stdio = ['pipe', 'pipe', 'pipe'];
    } else if (wslMode) {
      opts.stdio = ['ignore', 'pipe', 'pipe'];
    }
    const result = runSpawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-Command', WIN32_SCRIPT],
      opts
    );
    const line = String(result.stdout || '').trim().split(/\r?\n/).filter(Boolean).at(-1) || '';
    try {
      const parsed = JSON.parse(line);
      if (result.status === 0 && parsed?.ok) return parsed;
      if (parsed?.mismatch) {
        const actualEmail = normalizeEmail(parsed.actualEmail);
        const expected = normalizeEmail(parsed.expectedEmail || normalizedExpected);
        return actualEmail && expected
          ? mismatchResult(actualEmail, expected)
          : { ok: false, mismatch: true, actualEmail, expectedEmail: expected, error: parsed.error || '凭据所属账号不一致，已跳过写入' };
      }
      return { ok: false, error: parsed?.error || result.stderr?.trim() || '凭据操作失败' };
    } catch {
      return { ok: false, error: result.stderr?.trim() || result.error?.message || '凭据操作失败' };
    }
  }

  function readWslActiveEnvelope() {
    if (!existsSync(wslActiveTokenPath)) {
      return { ok: false, exists: false, error: '未检测到 WSL2 登录凭据文件（~/.gemini/jetski-standalone-oauth-token），请先完成登录' };
    }
    let tokenBuf = null;
    let scopeBuf = null;
    try {
      tokenBuf = readFileSync(wslActiveTokenPath);
      if (!tokenBuf.length) {
        return { ok: false, exists: false, error: 'WSL2 登录凭据文件为空，请重新登录' };
      }
      const email = extractCredentialEmail(tokenBuf);
      if (existsSync(wslActiveScopePath)) {
        scopeBuf = readFileSync(wslActiveScopePath);
      }
      const envelopeBuf = Buffer.from(JSON.stringify({
        v: 1,
        token: tokenBuf.toString('base64'),
        scope: scopeBuf ? scopeBuf.toString('base64') : null
      }), 'utf8');
      const hash = shortHash(envelopeBuf);
      return { ok: true, exists: true, envelopeBuf, hash, email };
    } catch (error) {
      return { ok: false, exists: false, error: error?.message || '读取 WSL2 登录凭据文件失败' };
    } finally {
      tokenBuf?.fill(0);
      scopeBuf?.fill(0);
    }
  }

  function writeWslActiveEnvelope(envelopeBuf) {
    let tokenBuf = null;
    let scopeBuf = null;
    try {
      const parsed = JSON.parse(envelopeBuf.toString('utf8'));
      if (!parsed || typeof parsed.token !== 'string' || !parsed.token) {
        return { ok: false, error: 'WSL2 凭据备份格式无效，请重新添加该账号' };
      }
      tokenBuf = Buffer.from(parsed.token, 'base64');
      if (!tokenBuf.length) return { ok: false, error: 'WSL2 凭据备份为空，请重新添加该账号' };
      atomicWriteSecure(wslActiveTokenPath, tokenBuf);
      if (typeof parsed.scope === 'string') {
        scopeBuf = Buffer.from(parsed.scope, 'base64');
        atomicWriteSecure(wslActiveScopePath, scopeBuf);
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error?.message || '写入 WSL2 登录凭据文件失败' };
    } finally {
      tokenBuf?.fill(0);
      scopeBuf?.fill(0);
    }
  }

  function probe({ force = false } = {}) {
    if (probeCache && !force) return probeCache;
    if (!supported) {
      probeCache = { supported: false, backend, reason: '当前系统不支持凭据库操作' };
      return probeCache;
    }
    if (platform === 'win32' || platform === 'darwin') {
      probeCache = { supported: true, backend, reason: '' };
      return probeCache;
    }
    if (wslMode) {
      const res = runWin32('probe', '');
      probeCache = res?.ok
        ? { supported: true, backend, reason: '' }
        : { supported: false, backend, reason: res?.error || '无法通过 WSL Interop 访问 Windows 凭据管理器' };
      return probeCache;
    }
    const res = runSpawn('secret-tool', ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 3000
    });
    if (res?.error?.code === 'ENOENT') {
      probeCache = { supported: false, backend, reason: '未安装 secret-tool（libsecret-tools），当前 Linux 环境不支持系统密钥环' };
      return probeCache;
    }
    if (!env?.DBUS_SESSION_BUS_ADDRESS && !env?.DISPLAY && !env?.WAYLAND_DISPLAY) {
      probeCache = { supported: false, backend, reason: '未检测到桌面密钥环服务（Linux Secret Service 不可用）' };
      return probeCache;
    }
    probeCache = { supported: true, backend, reason: '' };
    return probeCache;
  }

  function targetFor(accountId) {
    return vaultTargetFor(accountId, { wslDistro: distro });
  }

  function readMacSecret(service, account, { preferJxa = false } = {}) {
    const readViaJxa = () => {
      const script = buildMacKeychainReadScript({ service, account });
      const res = runSpawn('/usr/bin/osascript', ['-l', 'JavaScript'], {
        input: script,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 8000
      });
      if (res.status !== 0 || !res.stdout) return null;
      const b64 = Buffer.from(res.stdout).toString('utf8').trim();
      if (!b64) return null;
      try {
        return Buffer.from(b64, 'base64').toString('utf8');
      } catch {
        return null;
      }
    };
    const readViaSecurity = () => {
      const res = runSpawn('/usr/bin/security', ['find-generic-password', '-s', service, '-a', account, '-w'], {
        timeout: 8000
      });
      if (res.status !== 0 || !res.stdout) return null;
      return Buffer.from(res.stdout).toString('utf8').replace(/[\r\n]+$/, '');
    };
    if (preferJxa) {
      const fromJxa = readViaJxa();
      if (fromJxa !== null) return fromJxa;
      return readViaSecurity();
    }
    const fromSec = readViaSecurity();
    if (fromSec !== null) return fromSec;
    return readViaJxa();
  }

  function inspect(target) {
    if (!supported) return { exists: false, hash: '' };
    if (wslMode) {
      if (target === ACTIVE_TARGET) {
        const envRes = readWslActiveEnvelope();
        if (!envRes.ok) return { exists: false, hash: '' };
        const hash = envRes.hash;
        const email = normalizeEmail(envRes.email);
        envRes.envelopeBuf.fill(0);
        return { exists: true, hash, ...(email ? { email } : {}) };
      }
      const res = runWin32('inspect', target);
      const email = normalizeEmail(res.email);
      return { exists: Boolean(res.exists), hash: typeof res.hash === 'string' ? res.hash : '', ...(email ? { email } : {}) };
    }
    if (platform === 'win32') {
      const res = runWin32('inspect', target);
      const email = normalizeEmail(res.email);
      return { exists: Boolean(res.exists), hash: typeof res.hash === 'string' ? res.hash : '', ...(email ? { email } : {}) };
    }
    const { service, account } = splitPosixTarget(target);
    if (platform === 'darwin') {
      const secret = readMacSecret(service, account, { preferJxa: service === VAULT_SERVICE });
      if (secret === null) return { exists: false, hash: '' };
      const buf = Buffer.from(secret, 'utf8');
      const hash = shortHash(buf);
      const email = extractCredentialEmail(buf);
      buf.fill(0);
      return { exists: true, hash, ...(email ? { email } : {}) };
    }
    const res = runSpawn('secret-tool', ['lookup', 'service', service, 'username', account], {
      timeout: 8000
    });
    if (res.status !== 0 || !res.stdout) return { exists: false, hash: '' };
    const buf = Buffer.from(res.stdout);
    const hash = shortHash(buf);
    const email = extractCredentialEmail(buf);
    buf.fill(0);
    return { exists: true, hash, ...(email ? { email } : {}) };
  }

  function has(target) {
    if (!supported) return false;
    if (wslMode) {
      if (target === ACTIVE_TARGET) return existsSync(wslActiveTokenPath);
      return Boolean(runWin32('has', target).exists);
    }
    if (platform === 'win32') return Boolean(runWin32('has', target).exists);
    const { service, account } = splitPosixTarget(target);
    if (platform === 'darwin') {
      const res = runSpawn('/usr/bin/security', ['find-generic-password', '-s', service, '-a', account], {
        stdio: 'ignore',
        timeout: 8000
      });
      return res.status === 0;
    }
    const res = runSpawn('secret-tool', ['lookup', 'service', service, 'username', account], {
      stdio: ['ignore', 'ignore', 'ignore'],
      timeout: 8000
    });
    return res.status === 0;
  }

  function copy(fromTarget, toTarget, { userName = '', expectedEmail = '' } = {}) {
    if (!supported) return { ok: false, error: '当前系统不支持凭据库操作' };
    const normalizedExpected = normalizeEmail(expectedEmail);
    if (wslMode) {
      if (fromTarget === ACTIVE_TARGET) {
        const active = readWslActiveEnvelope();
        if (!active.ok) return { ok: false, error: active.error };
        const email = normalizeEmail(active.email);
        if (normalizedExpected && email && email !== normalizedExpected) {
          active.envelopeBuf.fill(0);
          return mismatchResult(email, normalizedExpected);
        }
        const b64 = active.envelopeBuf.toString('base64');
        active.envelopeBuf.fill(0);
        const written = runWin32('write', '', toTarget, userName || ACTIVE_USERNAME, b64);
        if (!written?.ok) return { ok: false, error: written?.error || '写入 Windows 凭据管理器失败' };
        return { ok: true, bytes: written.bytes, hash: active.hash || written.hash || '', ...(email ? { email } : {}) };
      }
      if (toTarget === ACTIVE_TARGET) {
        const readRes = runWin32('read', fromTarget);
        if (!readRes?.ok) return { ok: false, error: readRes?.error || '读取 Windows 凭据管理器失败' };
        if (!readRes.exists || !readRes.data) return { ok: false, error: 'Windows 凭据管理器中未找到该账号备份' };
        const envelopeBuf = Buffer.from(readRes.data, 'base64');
        const email = extractCredentialEmail(envelopeBuf);
        if (normalizedExpected && email && email !== normalizedExpected) {
          envelopeBuf.fill(0);
          return mismatchResult(email, normalizedExpected);
        }
        const hash = shortHash(envelopeBuf);
        const wrote = writeWslActiveEnvelope(envelopeBuf);
        envelopeBuf.fill(0);
        if (!wrote.ok) return wrote;
        return { ok: true, bytes: readRes.bytes, hash, ...(email ? { email } : {}) };
      }
      return runWin32('copy', fromTarget, toTarget, userName, undefined, normalizedExpected);
    }
    if (platform === 'win32') return runWin32('copy', fromTarget, toTarget, userName, undefined, normalizedExpected);
    const src = splitPosixTarget(fromTarget);
    const dst = splitPosixTarget(toTarget);
    if (platform === 'darwin') {
      const secret = readMacSecret(src.service, src.account, { preferJxa: src.service === VAULT_SERVICE });
      if (secret === null) {
        return { ok: false, error: '未能读取当前凭据' };
      }
      const buf = Buffer.from(secret, 'utf8');
      const email = extractCredentialEmail(buf);
      if (normalizedExpected && email && email !== normalizedExpected) {
        buf.fill(0);
        return mismatchResult(email, normalizedExpected);
      }
      const hash = shortHash(buf);
      const cmdPrefix = `add-generic-password -U -s ${JSON.stringify(dst.service)} -a ${JSON.stringify(dst.account)} -X `;
      const hexCmdBytes = Buffer.byteLength(cmdPrefix, 'utf8') + buf.length * 2 + 1;
      const singleQuoteSafe = /^[\x20-\x7e]+$/.test(secret) && !secret.includes("'");
      const rawCmd = singleQuoteSafe
        ? `add-generic-password -U -s ${JSON.stringify(dst.service)} -a ${JSON.stringify(dst.account)} -w '${secret}'\n`
        : '';
      let writeRes;
      if (hexCmdBytes < 3800) {
        const hex = buf.toString('hex');
        buf.fill(0);
        const cmd = `${cmdPrefix}${hex}\n`;
        writeRes = runSpawn('/usr/bin/security', ['-i'], {
          input: cmd,
          stdio: ['pipe', 'ignore', 'pipe'],
          timeout: 8000
        });
      } else if (rawCmd && Buffer.byteLength(rawCmd, 'utf8') < 3800) {
        // Issue #75: printable ASCII JSON up to ~3.7 KB fits directly in `/usr/bin/security -i`
        // without 2x hex expansion, preserving native `/usr/bin/security` ACLs and keeping argv clean.
        buf.fill(0);
        writeRes = runSpawn('/usr/bin/security', ['-i'], {
          input: rawCmd,
          stdio: ['pipe', 'ignore', 'pipe'],
          timeout: 8000
        });
      } else {
        // Issue #75: payloads exceeding `/usr/bin/security -i`'s 4096-byte interactive line buffer
        // write via Security.framework over JXA stdin so secrets never appear in argv.
        const b64 = buf.toString('base64');
        buf.fill(0);
        const script = buildMacKeychainWriteScript({ service: dst.service, account: dst.account, dataBase64: b64 });
        writeRes = runSpawn('/usr/bin/osascript', ['-l', 'JavaScript'], {
          input: script,
          stdio: ['pipe', 'ignore', 'pipe'],
          timeout: 8000
        });
      }
      if (writeRes.status !== 0) {
        return { ok: false, error: String(writeRes.stderr || '').trim() || '写入钥匙串失败' };
      }
      return { ok: true, bytes: Buffer.byteLength(secret, 'utf8'), hash, ...(email ? { email } : {}) };
    }
    const readRes = runSpawn('secret-tool', ['lookup', 'service', src.service, 'username', src.account], {
      timeout: 8000
    });
    if (readRes.error?.code === 'ENOENT') {
      return { ok: false, error: '未安装 secret-tool（libsecret-tools），当前 Linux 环境不支持系统密钥环' };
    }
    if (readRes.status !== 0 || !readRes.stdout) {
      return { ok: false, error: String(readRes.stderr || '').trim() || '未能读取当前凭据（系统密钥环不可用或未登录）' };
    }
    const buf = Buffer.from(readRes.stdout);
    const email = extractCredentialEmail(buf);
    if (normalizedExpected && email && email !== normalizedExpected) {
      buf.fill(0);
      return mismatchResult(email, normalizedExpected);
    }
    const hash = shortHash(buf);
    const writeRes = runSpawn('secret-tool', ['store', '--label=Agy Powertools', 'service', dst.service, 'username', dst.account], {
      input: buf,
      stdio: ['pipe', 'ignore', 'pipe'],
      timeout: 8000
    });
    buf.fill(0);
    if (writeRes.status !== 0) {
      return { ok: false, error: String(writeRes.stderr || '').trim() || '写入密钥环失败' };
    }
    return { ok: true, bytes: readRes.stdout.length, hash, ...(email ? { email } : {}) };
  }

  function remove(target) {
    if (!supported) return { ok: false, error: '当前系统不支持凭据库操作' };
    if (platform === 'win32' || wslMode) return runWin32('remove', target);
    const { service, account } = splitPosixTarget(target);
    if (platform === 'darwin') {
      const res = runSpawn('/usr/bin/security', ['delete-generic-password', '-s', service, '-a', account], {
        stdio: 'ignore',
        timeout: 8000
      });
      return { ok: res.status === 0 || res.status === 44 };
    }
    const res = runSpawn('secret-tool', ['clear', 'service', service, 'username', account], {
      stdio: 'ignore',
      timeout: 8000
    });
    return { ok: res.status === 0 };
  }

  return {
    supported,
    backend,
    wslMode,
    probe,
    has,
    inspect,
    copy,
    remove,
    targetFor,
    saveActiveTo: (accountId, opts) => copy(ACTIVE_TARGET, targetFor(accountId), opts),
    restoreToActive: (accountId, opts) => copy(targetFor(accountId), ACTIVE_TARGET, { ...opts, userName: ACTIVE_USERNAME }),
    hasSaved: accountId => has(targetFor(accountId)),
    inspectSaved: accountId => inspect(targetFor(accountId)),
    inspectActive: () => inspect(ACTIVE_TARGET),
    removeSaved: accountId => remove(targetFor(accountId))
  };
}
