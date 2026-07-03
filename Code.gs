/*******************************************************
 * 循环回流式风洞设备预约系统 - 高级版后端
 * 平台：Google Apps Script11
 *******************************************************/

const SPREADSHEET_ID = "13hzi6nwEoBNWZDlfcaHzUi2D2JPuOuVHbSz9Bt67cDo";
const SHEET_NAME = "预约记录";
const CALENDAR_ID = "primary";

const DEVICE_NAME = "循环回流式风洞设备";
const GROUP_NAME = "王中林课题组";
const MANAGER_NAME = "胡家鑫";
const MANAGER_PHONE = "18627506509";

const OPEN_HOUR = 0;
const CLOSE_HOUR = 24;

function doGet(e) {
  return jsonOutput({
    success: true,
    message: "循环回流式风洞设备预约系统 GitHub 后端运行正常。",
    usage: "请通过 GitHub Pages 前端访问预约系统。"
  });
}

function doPost(e) {
  try {
    const request = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : "{}");
    const action = request.action;

    if (action === "submitBooking") {
      return jsonOutput(submitBooking(request.payload || {}));
    }

    if (action === "listBookingsByDate") {
      return jsonOutput(listBookingsByDate(request.date));
    }

    if (action === "listMonthBookings") {
      return jsonOutput(listMonthBookings());
    }

    if (action === "getDashboardData") {
      return jsonOutput(getDashboardData(request.date));
    }

    return jsonOutput({
      success: false,
      message: "未知请求类型：" + action
    });
  } catch (error) {
    return jsonOutput({
      success: false,
      message: "后端请求处理失败：" + error.message
    });
  }
}

function jsonOutput(object) {
  return ContentService
    .createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}


function submitBooking(data) {
  try {
    const validation = validateData(data);
    if (!validation.success) return validation;

    const start = buildDateTime(data.date, data.startTime);
    const end = buildDateTime(data.date, data.endTime);

    if (end <= start) {
      return { success: false, conflict: true, message: "预约失败：结束时间必须晚于开始时间。" };
    }

    const sameDayBookings = getSuccessfulBookingsByDate(data.date);
    const localConflicts = sameDayBookings.filter(item => {
      return isOverlapping(
        start,
        end,
        buildDateTime(item.date, item.startTime),
        buildDateTime(item.date, item.endTime)
      );
    });

    if (localConflicts.length > 0) {
      saveRecord(data, "预约失败：该时段已有预约");
      return {
        success: false,
        conflict: true,
        message: "预约失败：该时段已有预约，请更换预约时间。",
        conflicts: localConflicts
      };
    }

    const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    const calendarConflicts = calendar.getEvents(start, end, { search: DEVICE_NAME });

    if (calendarConflicts.length > 0) {
      saveRecord(data, "预约失败：Google 日历中该时段已有预约");
      return {
        success: false,
        conflict: true,
        message: "预约失败：Google 日历中该时段已有预约，请更换预约时间。"
      };
    }

    const eventTitle = DEVICE_NAME + "预约 - " + data.name;
    const description =
      "设备名称：" + DEVICE_NAME + "\n" +
      "预约人：" + data.name + "\n" +
      "所属课题组/单位：" + data.group + "\n" +
      "联系方式：" + data.phone + "\n" +
      "使用日期：" + data.date + "\n" +
      "开始时间：" + data.startTime + "\n" +
      "结束时间：" + data.endTime + "\n" +
      "实验内容：" + data.experiment + "\n" +
      "使用前检查：" + data.checks + "\n" +
      "备注：" + (data.note || "无") + "\n\n" +
      "设备管理人：" + MANAGER_NAME + "\n" +
      "联系电话：" + MANAGER_PHONE;

    calendar.createEvent(eventTitle, start, end, { description: description });
    saveRecord(data, "预约成功");

    return {
      success: true,
      conflict: false,
      message: "预约成功。请按预约时间使用设备，并现场填写使用记录。"
    };
  } catch (error) {
    return { success: false, conflict: false, message: "系统错误：" + error.message };
  }
}

function listBookingsByDate(dateText) {
  try {
    const bookings = getSuccessfulBookingsByDate(dateText);
    return {
      success: true,
      bookings: bookings,
      count: bookings.length,
      stats: buildStats(bookings),
      openHour: OPEN_HOUR,
      closeHour: CLOSE_HOUR
    };
  } catch (error) {
    return { success: false, message: "读取所选日期预约失败：" + error.message, bookings: [], count: 0 };
  }
}

function listMonthBookings() {
  try {
    const sheet = getSheet();
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return { success: true, bookings: [] };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneMonthLater = new Date(today);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    oneMonthLater.setHours(23, 59, 59, 999);

    const result = values
      .slice(1)
      .filter(row => row[1] === "预约成功")
      .map(row => rowToBooking(row))
      .filter(item => {
        const start = buildDateTime(item.date, item.startTime);
        return start >= today && start <= oneMonthLater;
      })
      .sort((a, b) => buildDateTime(a.date, a.startTime) - buildDateTime(b.date, b.startTime));

    return { success: true, bookings: result };
  } catch (error) {
    return { success: false, message: "读取未来一个月预约失败：" + error.message, bookings: [] };
  }
}

function getDashboardData(dateText) {
  try {
    const selectedDate = dateText || formatDate(new Date());
    const todayText = formatDate(new Date());
    const selectedBookings = getSuccessfulBookingsByDate(selectedDate);
    const todayBookings = getSuccessfulBookingsByDate(todayText);

    return {
      success: true,
      device: {
        name: DEVICE_NAME,
        group: GROUP_NAME,
        manager: MANAGER_NAME,
        phone: MANAGER_PHONE,
        openHour: OPEN_HOUR,
        closeHour: CLOSE_HOUR
      },
      selectedDate: selectedDate,
      selectedBookings: selectedBookings,
      selectedStats: buildStats(selectedBookings),
      todayDate: todayText,
      todayBookings: todayBookings,
      todayStats: buildStats(todayBookings)
    };
  } catch (error) {
    return { success: false, message: "读取仪表盘数据失败：" + error.message };
  }
}

function getSuccessfulBookingsByDate(dateText) {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  return values
    .slice(1)
    .filter(row => row[1] === "预约成功" && normalizeDateCell(row[3]) === dateText)
    .map(row => rowToBooking(row))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function buildStats(bookings) {
  const totalHours = CLOSE_HOUR - OPEN_HOUR;
  let usedMinutes = 0;

  bookings.forEach(item => {
    const startMinutes = timeTextToMinutes(item.startTime);
    const endMinutes = timeTextToMinutes(item.endTime);
    const clippedStart = Math.max(startMinutes, OPEN_HOUR * 60);
    const clippedEnd = Math.min(endMinutes, CLOSE_HOUR * 60);

    if (clippedEnd > clippedStart) {
      usedMinutes += clippedEnd - clippedStart;
    }
  });

  const usedHours = Math.round((usedMinutes / 60) * 10) / 10;
  const freeHours = Math.max(0, Math.round((totalHours - usedHours) * 10) / 10);
  const usageRate = totalHours > 0 ? Math.round((usedHours / totalHours) * 100) : 0;

  return {
    bookingCount: bookings.length,
    usedHours: usedHours,
    freeHours: freeHours,
    usageRate: usageRate,
    totalHours: totalHours
  };
}

function validateData(data) {
  const required = [
    ["name", "预约人姓名"],
    ["group", "所属课题组/单位"],
    ["phone", "联系方式"],
    ["date", "使用日期"],
    ["startTime", "开始时间"],
    ["endTime", "结束时间"],
    ["experiment", "实验内容"],
    ["checks", "使用前检查"]
  ];

  for (const item of required) {
    const key = item[0];
    const label = item[1];

    if (!data[key] || String(data[key]).trim() === "") {
      return { success: false, conflict: false, message: "预约失败：请填写“" + label + "”。" };
    }
  }

  return { success: true };
}

function rowToBooking(row) {
  return {
    submittedAt: normalizeDateTimeCell(row[0]),
    status: row[1],
    device: row[2],
    date: normalizeDateCell(row[3]),
    startTime: normalizeTimeCell(row[4]),
    endTime: normalizeTimeCell(row[5]),
    name: row[6],
    group: row[7],
    phone: row[8],
    experiment: row[9],
    checks: row[10],
    note: row[11] || ""
  };
}

function saveRecord(data, status) {
  const sheet = getSheet();

  sheet.appendRow([
    new Date(),
    status,
    DEVICE_NAME,
    data.date,
    data.startTime,
    data.endTime,
    data.name,
    data.group,
    data.phone,
    data.experiment,
    data.checks,
    data.note || ""
  ]);
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "提交时间",
      "预约状态",
      "设备名称",
      "使用日期",
      "开始时间",
      "结束时间",
      "预约人姓名",
      "所属课题组/单位",
      "联系方式",
      "实验内容",
      "使用前检查",
      "备注"
    ]);
  }

  return sheet;
}

function buildDateTime(dateText, timeText) {
  const dateStr = normalizeDateCell(dateText);
  const timeStr = normalizeTimeCell(timeText);

  const dateParts = dateStr.split("-");
  const timeParts = timeStr.split(":");

  return new Date(
    Number(dateParts[0]),
    Number(dateParts[1]) - 1,
    Number(dateParts[2]),
    Number(timeParts[0]),
    Number(timeParts[1]),
    0,
    0
  );
}

function isOverlapping(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function timeTextToMinutes(timeText) {
  const timeStr = normalizeTimeCell(timeText);
  const parts = timeStr.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function normalizeDateCell(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value);
}

function normalizeTimeCell(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "HH:mm");
  }

  const text = String(value);

  if (/^\d{1,2}:\d{2}$/.test(text)) {
    const parts = text.split(":");
    return String(Number(parts[0])).padStart(2, "0") + ":" + parts[1];
  }

  if (/^\d{1,2}:\d{2}:\d{2}$/.test(text)) {
    const parts = text.split(":");
    return String(Number(parts[0])).padStart(2, "0") + ":" + parts[1];
  }

  return text;
}

function normalizeDateTimeCell(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  }
  return String(value || "");
}
