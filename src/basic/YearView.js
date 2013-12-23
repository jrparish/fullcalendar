fcViews.year = YearView;

function YearView(element, calendar) {
	var t = this;

	// exports
	t.render = render;

	// imports
	BasicYearView.call(t, element, calendar, 'year');
	var opt = t.opt;
	var renderYear = t.renderYear;
	var formatDate = calendar.formatDate;

	function render(date, delta) {
		if (delta) {
			t.curYear = addYears(date, delta);
		}
		var start = cloneDate(date, true);
		var firstMonth = opt('firstMonth') || 0;
		start.setFullYear(start.getFullYear(),firstMonth,1);
		var end = cloneDate(date);
		end.setFullYear(end.getFullYear()+((firstMonth+12)/12)|0, (firstMonth+11)%12,31);

		var visStart = cloneDate(start); //set startDay
		var firstDay = opt('firstDay');

		var visEnd = cloneDate(end);
		var nwe = opt('weekends') ? 0 : 1;
		addDays(visStart, -((visStart.getDay() - Math.max(firstDay, nwe) + 7) % 7));
		addDays(visEnd, (7 - visEnd.getDay() + Math.max(firstDay, nwe)) % 7);
		colAndRow = '3x4'; //TODO support '2x6', '3x4', '4x3' 3 types

		t.title = formatDate(start, opt('titleFormat'));
		t.start = start;
		t.end = end;
		t.visStart = visStart;
		t.visEnd = visEnd;
		renderYear(colAndRow, 6, nwe ? 5 : 7, true);
	}
}

function BasicYearView(element, calendar, viewName) {
	var t = this;

	// exports
	t.renderYear = renderYear;
	t.setHeight = setHeight;
	t.setWidth = setWidth;
	t.renderDayOverlay = renderDayOverlay;
	t.defaultSelectionEnd = defaultSelectionEnd;
	t.renderSelection = renderSelection;
	t.clearSelection = clearSelection;
	t.reportDayClick = reportDayClick; // for selection (kinda hacky)
	t.defaultEventEnd = defaultEventEnd;
	t.getHoverListener = function() { return hoverListener };
	t.colContentLeft = colContentLeft;
	t.colContentRight = colContentRight;
	t.colLeft = colLeft;
	t.colRight = colRight;
	t.dayOfWeekCol = dayOfWeekCol;
	t.dateCell = dateCell;
	t.allDayRow = allDayRow;
	t.allDayBounds = allDayBounds;
	t.getIsCellAllDay = function() { return true };
	t.getRowCnt = function() { return rowCnt; };
	t.getColCnt = function() { return colCnt; };
	t.getColWidth = function() { return colWidth; };
	t.getBodyRows = function() { return bodyRows; };
	t.getDaySegmentContainer = function() { return daySegmentContainer; };
	t.getRowMaxWidth = getRowMaxWidth;

	// imports
	View.call(t, element, calendar, viewName);
	OverlayManager.call(t);
	SelectionManager.call(t);
	BasicEventRenderer.call(t);
	t.rowToGridOffset = rowToGridOffset;
	t.dayOffsetToCellOffset = dayOffsetToCellOffset;
	t.cellToCellOffset = cellToCellOffset;
	t.cellOffsetToDayOffset = cellOffsetToDayOffset;
	var opt = t.opt;
	var trigger = t.trigger;
	var clearEvents = t.clearEvents;
	var renderOverlay = t.renderOverlay;
	var clearOverlays = t.clearOverlays;
	var daySelectionMousedown = t.daySelectionMousedown;
	var formatDate = calendar.formatDate;

	// locals
	var table;
	var body;
	var bodyRows;

	var mainBody;
	var subTables;

	var bodyCells;
	var bodyCellTopInners;
	var daySegmentContainer;

	var viewWidth;
	var viewHeight;
	var colWidth;

	var rowCnt, colCnt;
	var coordinateGrids = [];
	var coordinateGrid;
	var hoverListener;
	var colContentPositions;
	var otherMonthDays = [];
	var rowsForMonth = [];

	var rtl, dis, dit;
	var firstDay;
	var firstMonth;
	var lastMonth;
	var nwe;
	var tm;
	var colFormat;

	/* Rendering
	------------------------------------------------------------*/

	disableTextSelection(element.addClass('fc-grid'));

	function renderYear(maxr, r, c, showNumbers) {
		// rowCnt set by buildingskeleton
		colCnt = c;
		updateOptions();
		var firstTime = !table;
		if (firstTime) {
			buildSkeleton(maxr, showNumbers);
		} else {
			clearEvents();
		}
		$('a.fc-year-monthly-name').attr('data-year', t.start.getFullYear());
		updateCells(firstTime);
	}

	function updateOptions() {
		rtl = opt('isRTL');
		if (rtl) {
			dis = -1;
			dit = colCnt - 1;
		} else {
			dis = 1;
			dit = 0;
		}
		firstDay = opt('firstDay');
		firstMonth = opt('firstMonth') || 0;
		lastMonth = t.end.getMonth();
		nwe = opt('weekends') ? 0 : 1;
		tm = opt('theme') ? 'ui' : 'fc';
		colFormat = opt('columnFormat');
	}

	function buildSkeleton(maxRowCnt, showNumbers) {
		var s;
		var headerClass = tm + "-widget-header";
		var contentClass = tm + "-widget-content";
		var i, j;
		var dayStr;
		var di = cloneDate(t.start);
		var monthsPerRow = parseInt(maxRowCnt); //a bit hookey, "3x4" parses to 3

		rowCnt = 0;
		var localWeekNames = [];
		// init days based on 2013-12 (1st is Sunday)
		for (var m=0; m<7; m++) {
			di.setFullYear(2013,11,1+m);
			localWeekNames[m] = formatDate(di, 'ddd');
		}
		di = cloneDate(t.start);
		s = '<table class="fc-border-separate fc-year-main-table" style="width:100%;"><tr>';
		for (var m=0; m<=lastMonth; m++) {
			var mi = (m+firstMonth)%12;
			var miYear = di.getFullYear() + ((m+firstMonth)/12)|0;
			di.setFullYear(miYear,mi,1);
			var monthName = formatDate(di, 'MMMM');

			if (nwe) { skipWeekend(di); }
			var dowFirst = (di.getDay()+7-firstDay)%7;
			di.setFullYear(miYear,mi, -1 * dowFirst+1);
			if (m%monthsPerRow==0 && m > 0) s+="</tr><tr>";

			if (m%monthsPerRow < monthsPerRow && m%monthsPerRow) {
				s +='<td class="fc-year-month-separator"></td>';
			}

			s +='<td class="fc-year-monthly-td">';
			s +='<table class="fc-border-separate" style="width:100%" cellspacing="0">'+
				'<thead>'+
				'<tr><td colspan="7" class="fc-year-monthly-header" />' + 
					'<a data-month="'+mi+'" class="fc-year-monthly-name" href="#">' +
					htmlEscape(monthName) + '</a>' +
				'</td></tr>' +
				'<tr>';

			for (i=firstDay; i<colCnt+firstDay; i++) {
				// need fc- for setDayID
				s += '<th class="fc-year-month-weekly-head fc-'+dayIDs[i%7]+' fc-widget-header" width="'+((100/colCnt)|0)+'%">'+
				 localWeekNames[i%7]+'</th>';
			}
			s += '</tr></thead><tbody>';

			rowsForMonth[mi] = 0;
			for (i=0; i<6; i++) {
				if (nwe) {
					skipWeekend(di);
				}
				//don't show week if all days are in next month
				if (di.getMonth() == (mi+1)%12) {
					continue;
				}
				rowsForMonth[mi]++;
				rowCnt++;

				s += '<tr class="fc-week' + i + '">';
				for (j=0; j<colCnt; j++) {
					if(di.getMonth()== mi) {
						dayStr=formatDate(di, '-yyyy-MM-dd');
					} else {
						dayStr='';
					}
					s += '<td class="'+contentClass+' fc-day fc-'+dayIDs[di.getDay()]+' fc-day'+dayStr + '">' + // need fc- for setDayID
					'<div>' +
						(showNumbers ? '<div class="fc-day-number"/>' : '') +
						'<div class="fc-day-content" style="min-height:20px;">' +
							'<div style="position:relative;"></div>' +
						'</div>' +
					'</div>' +
					'</td>';
					addDays(di, 1);
				}
				if (nwe) {
					skipWeekend(di);
				}
				s += '</tr>';
			}
			s += '</tbody></table>';
			s += '<div class="fc-year-monthly-footer"></div>';
			s += '</td>';
		}
		s += '</tr></table>';
		table = $(s).appendTo(element);
		head = table.find('thead');
		headCells = head.find('th.fc-year-month-weekly-head');

		bodyRows = table.find('table tbody tr');
		bodyCells = bodyRows.find('td').not('.fc-year-monthly-td');
		bodyFirstCells = bodyCells.filter(':first-child');

		subTables = table.find('table');
		subTables.find('tbody .fc-week0').addClass('fc-first');
		subTables.find('tbody > tr:last').addClass('fc-last');

		bodyCellTopInners = subTables.find('tbody .fc-week0 .fc-day-content div');

		markFirstLast(head.add(head.find('tr'))); // marks first+last tr/th's
		markFirstLast(bodyRows);

		table.find('.fc-year-monthly-name').click(function() {
			calendar.gotoDate($(this).attr('data-year'), $(this).attr('data-month'), 1);
			calendar.changeView('month');
		});

		dayBind(bodyCells);
		daySegmentContainer = $('<div style="position:absolute;z-index:8;top:0;left:0;"/>').appendTo(element);
	}

	function updateCells(firstTime) {
		var startYear = t.start.getFullYear();
		var today = clearTime(new Date());
		var cell;
		var date;
		var row;

		subTables.each(function(i, _sub) {
			if (!t.curYear) t.curYear = t.start;
			otherMonthDays[i] = [0,0,0,0];

			var d = cloneDate(t.curYear);
			var mi = (i+firstMonth)%12;
			var miYear = d.getFullYear() + ((i+firstMonth)/12)|0;
			d.setFullYear(miYear,mi,1);
			if (nwe) { skipWeekend(d); }

			var dowFirst = (d.getDay()+7-firstDay)%7;
			var lastDateShown = 0;
			d.setFullYear(miYear,mi, -1 * dowFirst+1);
			$(_sub).find('tbody > tr').each(function(iii, _tr) {
				if (nwe) { skipWeekend(d); }
				if (iii == 0 && d.getMonth() == mi) {
					otherMonthDays[i][2] = d.getDate()-1;
				}
				$(_tr).find('td').each(function(ii, _cell) {

					var dayStr;
					cell = $(_cell);

					if (d.getMonth() == mi) {
						cell.removeClass('fc-other-month');
						dayStr=formatDate(d, '-yyyy-MM-dd');
					} else {
						cell.addClass('fc-other-month');
						dayStr="";
						if ((d.getMonth() == mi-1) || (mi == 0 && d.getMonth() == lastMonth)) {
							otherMonthDays[i][0]++;
						} else {
							otherMonthDays[i][1]++;
						}
					}
					if (+d == +today && d.getMonth() == i) {
						cell.addClass(tm + '-state-highlight fc-today');
					} else {
						cell.removeClass(tm + '-state-highlight fc-today');
					}
					var $div = cell.find('div.fc-day-number');
					$div.text(d.getDate());

					if (d.getMonth() == mi) { lastDateShown = d.getDate(); }
					addDays(d, 1);
				});
				if (nwe) { skipWeekend(d); }
			});

			var endDaysHidden = daysInMonth(t.curYear.getYear(), mi+1) - lastDateShown;
			otherMonthDays[i][3] = endDaysHidden;
		});
		bodyRows.filter('.fc-year-have-event').removeClass('fc-year-have-event');
	}

	function setHeight(height) {
		//not sure what supposed to do
	}

	function setWidth(width) {
		viewWidth = width;
		colContentPositions.clear();
	}


	/* Day clicking and binding
	-----------------------------------------------------------*/

	function dayBind(days) {
		days.click(dayClick).mousedown(daySelectionMousedown);
	}

	function dayClick(ev) {
		if (!opt('selectable')) { // if selectable, SelectionManager will worry about dayClick
			var match = this.className.match(/fc\-day\-(\d+)\-(\d+)\-(\d+)/);
			var date = new Date(match[1], match[2]-1, match[3]);
			trigger('dayClick', this, date, true, ev);
		}
	}


	/* Semi-transparent Overlay Helpers
	------------------------------------------------------*/

	function renderDayOverlay(overlayStart, overlayEnd, refreshCoordinateGrid) { // overlayEnd is exclusive
		if (refreshCoordinateGrid) {
			coordinateGrid.build();
		}
		var rowStart = cloneDate(t.visStart);

		var row = 0;
		subTables.each(function(m, _sub) {
			var d = cloneDate(t.curYear);
			var mo = (m+firstMonth)%12;
			var moYear = d.getFullYear()+((m+firstMonth)/12)|0;
			d.setFullYear(moYear,mo,1);
			if (nwe) { skipWeekend(d); }
			var dowFirst = (d.getDay()+7-firstDay)%7;
			d.setFullYear(moYear,mo, -1 * dowFirst+1);

			$(_sub).find('tbody > tr').each(function(iii, _tr) {

				if (nwe) { skipWeekend(d); }

				var curCols = colCnt;
				var rowStart = cloneDate(d);
				while (rowStart.getMonth() != mo) {
					addDays(rowStart, 1);
					curCols--;
				}

				var rowEnd = cloneDate(rowStart);
				for (i = 0; i < curCols; i++) {
					addDays(rowEnd, 1);
					if (rowEnd.getMonth() > rowStart.getMonth()) {
						break;
					}
				}

				var stretchStart = new Date(Math.max(rowStart, overlayStart));
				var stretchEnd = new Date(Math.min(rowEnd, overlayEnd));
				if (stretchStart < stretchEnd) {
					var colStart, colEnd;
					if (rtl) {
						colStart = dayDiff(stretchEnd, d)*dis+dit+1;
						colEnd = dayDiff(stretchStart, d)*dis+dit+1;
					} else {
						colStart = dayDiff(stretchStart, d);
						colEnd = dayDiff(stretchEnd, d);
					}
					var grid = coordinateGrids[m];
					dayBind(
						renderCellOverlay(grid, iii, colStart, iii, colEnd-1)
					);
				}
				row += 1;
				addDays(d, 5);
				if (nwe) { skipWeekend(d); } else { addDays(d, 2); }
			});
		});
	}

	function renderCellOverlay(grid, row0, col0, row1, col1) { // row1,col1 is inclusive
		var rect = grid.rect(row0, col0, row1, col1, element);
		return renderOverlay(rect, element);
	}

	function getRowMaxWidth(row) {
		return $(subTables[(row/5)|0]).width();
	}

	/* Selection
	-----------------------------------------------------------------------*/

	function defaultSelectionEnd(startDate, allDay) {
		return cloneDate(startDate);
	}

	function renderSelection(startDate, endDate, allDay) {
		var m = startDate.getMonth();
		coordinateGrid = coordinateGrids[m];
		renderDayOverlay(startDate, addDays(cloneDate(endDate), 1), true); // rebuild every time???
	}

	function clearSelection() {
		clearOverlays();
	}

	function reportDayClick(date, allDay, ev) {
		var cell = dateCell(date);
		var _element = bodyCells[cell.row*colCnt + cell.col];
		trigger('dayClick', _element, date, allDay, ev);
	}


	/* Utilities
	--------------------------------------------------------*/
	function cellsForMonth(i) {
		return rowsForMonth[i] * (nwe ? 5 : 7);
	}

	function dayOffsetToCellOffset(dayOffset) {
		var decal = otherMonthDays[0][0];
		var offset = 0 - decal;
		for (var i=0; i<=lastMonth; i++) {
			var mo = (i + firstMonth)%12+1;
			var moDays = daysInMonth(t.curYear.getYear(), mo);

			if (dayOffset < moDays + decal || (i==lastMonth && dayOffset < cellsForMonth(i) + decal)) {
				offset += otherMonthDays[i][0]; //days in other month at beginning of month;
				var di = cloneDate(t.visStart);
				addMonths(di, i);
				di.setDate(1);
				for (j = 1; j <= dayOffset; j++) {
					if (nwe) {
						if (di.getDay() != 0 && di.getDay() != 6) {
							offset += 1;
						}
					} else {
						offset += 1;
					}
					addDays(di, 1);
				}
				return offset;
			}
			if (i == lastMonth) {
				// on last month, allow overflow
				return (offset + dayOffset);
			}
			dayOffset -= moDays;
			offset += cellsForMonth(i);
		}
	}

	function cellToCellOffset(row, col) {
		var colCnt = t.getColCnt();
		var grid = null;

		// rtl variables. wish we could pre-populate these. but where?
		var dis = rtl ? -1 : 1;
		var dit = rtl ? colCnt - 1 : 0;

		if (typeof row == 'object') {
			grid = row.grid;
			col = row.col;
			row = row.row;
		}

		var offset = 0;
		for (var i = 0; i < grid.offset; i++) {
			offset += cellsForMonth(i);
		}

		offset += row * colCnt + (col * dis + dit); // column, adjusted for RTL (dis & dit)

		return offset;
	}

	function cellOffsetToDayOffset(cellOffset) {
		var offset = otherMonthDays[0][0];
		for (var i=0; i<=lastMonth; i++) {
			var mo = (i + firstMonth)%12+1;
			var moDays = daysInMonth(t.curYear.getYear(), mo);
			var moCellDays = cellsForMonth(i);
			if (cellOffset < moCellDays) {
				cellOffset -= otherMonthDays[i][0];

				offset += otherMonthDays[i][2];

				var di = cloneDate(t.visStart);
				addMonths(di, i);
				di.setDate(1 + otherMonthDays[i][2]);
				while (cellOffset > 0) {
					if (nwe) {
						if (di.getDay() != 5 && di.getDay() != 6) {
							cellOffset -= 1;
						}
					} else {
						cellOffset -= 1;
					}
					addDays(di, 1);
					offset += 1;
				}
				return offset;
			}

			cellOffset -= moCellDays;
			offset += moDays;
		}
	}

	function daysInMonth(year, month) {
		return new Date(year, month, 0).getDate();
	}

	function rowToGridOffset(row) {
		var cnt = 0;
		for (var i=0; i<=lastMonth; i++) {
			cnt += rowsForMonth[i];
			if (row < cnt) { return i; }
		}
		return -1;
	}

	function defaultEventEnd(event) {
		return cloneDate(event.start);
	}

	function tableByOffset(offset) {
		return $(subTables[offset]);
	}

	var nums = [0,1,2,3,4,5,6,7,8,9,10,11];
	$.each(nums, function(i, val) {
		var offset = new Number(val);
		var grid = new CoordinateGrid(function(rows, cols) {
			var _subTable = tableByOffset(offset);
			var _head = _subTable.find('thead');
			var _headCells = _head.find('th.fc-year-month-weekly-head');
			var _bodyRows = _subTable.find('tbody tr');

			var e, n, p;
			_headCells.each(function(i, _e) {
				e = $(_e);
				n = e.offset().left;
				p = [n, n+e.outerWidth()];
				cols[i] = p;
			});
			_bodyRows.each(function(i, _e) {
				if (i < rowCnt) {
					e = $(_e);
					n = e.offset().top;
					p = [n, n+e.outerHeight()];
					rows[i] = p;
				}
			});
		});
		grid.offset = offset;
		coordinateGrids.push(grid);
	});

	hoverListener = new HoverListener(coordinateGrids);

	colContentPositions = new HorizontalPositionCache(function(col) {
		return bodyCellTopInners.eq(col);
	});

	function colContentLeft(col, gridOffset) {
		var grid = tableByOffset(gridOffset);
		return colContentPositions.left(col) + grid.position().left;
	}

	function colContentRight(col, gridOffset) {
		var grid = tableByOffset(gridOffset);
		return colContentPositions.right(col) + grid.position().left;
	}

	function colLeft(col, gridOffset) {
		return colContentLeft(col, gridOffset);
	}

	function colRight(col, gridOffset) {
		return colContentRight(col, gridOffset);
	}

	function dateCell(date) {
		return {
			row: Math.floor(dayDiff(date, t.visStart) / 7),
			col: dayOfWeekCol(date.getDay())
		};
	}

	function dayOfWeekCol(dayOfWeek) {
		return ((dayOfWeek - Math.max(firstDay, nwe) + colCnt) % colCnt) * dis + dit;
	}

	function allDayRow(i) {
		return bodyRows.eq(i);
	}

	function allDayBounds(i) {
		return {
			left: 0,
			right: viewWidth
		};
	}


}
