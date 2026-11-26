// Adapted from HextaUI DateRangeCalendar's two-click range interaction.
// Source: https://hextaui.com/r/date-picker.json (retrieved 2026-11-13).
// Popover, dropdowns, typography and colors are supplied by Antigravity.
import * as React from 'react';
import {DayPicker} from 'react-day-picker';
import {zhCN,zhTW,enUS,fr,ja,ko,de,es,ru} from 'react-day-picker/locale';

export function DateRangeCalendar({value,language,Dropdown,Chevron,onComplete}) {
  const [draft,setDraft]=React.useState(undefined);
  return <DayPicker mode="range" autoFocus numberOfMonths={1} showOutsideDays
    locale={({'zh-CN':zhCN,'zh-TW':zhTW,en:enUS,fr,ja,ko,de,es,ru})[language] || enUS} weekStartsOn={1} captionLayout="dropdown" navLayout="around"
    startMonth={new Date(1970,0)} endMonth={new Date(new Date().getFullYear()+1,11)}
    defaultMonth={value?.from} selected={draft??value??undefined}
    className="pt-calendar" classNames={{root:'pt-calendar',months:'pt-calendar-months',month:'pt-calendar-month',month_caption:'pt-calendar-caption',dropdowns:'pt-calendar-dropdowns',dropdown_root:'pt-calendar-dropdown-root',caption_label:'pt-calendar-caption-label',nav:'pt-calendar-nav',button_previous:'pt-calendar-nav-button pt-calendar-prev',button_next:'pt-calendar-nav-button pt-calendar-next',month_grid:'pt-calendar-grid',weekdays:'pt-calendar-weekdays',weekday:'pt-calendar-weekday',week:'pt-calendar-week',day:'pt-calendar-day',day_button:'pt-calendar-day-button',selected:'pt-calendar-selected',today:'pt-calendar-today',outside:'pt-calendar-outside',disabled:'pt-calendar-disabled',range_start:'pt-calendar-range-start',range_end:'pt-calendar-range-end',range_middle:'pt-calendar-range-middle',hidden:'pt-calendar-hidden'}}
    components={{Dropdown,Chevron}}
    onSelect={(_,day)=>{
      if(!draft){setDraft({from:day,to:day});return;}
      const start=draft.from??day;
      const range=day<start?{from:day,to:start}:{from:start,to:day};
      setDraft(undefined);onComplete(range);
    }}/>
}
