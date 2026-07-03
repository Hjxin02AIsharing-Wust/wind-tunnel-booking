/*
  循环回流式风洞设备预约系统 - Google Apps Script 后端

  部署步骤：
  1. 新建 Google 表格，命名为“循环回流式风洞设备预约记录”。
  2. 在表格中点击：扩展程序 → Apps Script。
  3. 删除默认代码，粘贴本文件全部内容。
  4. 修改 SPREADSHEET_ID 为你的 Google 表格 ID。
  5. 修改 CALENDAR_ID：使用默认日历填 "primary"；使用专门设备日历填该日历 ID。
  6. 点击“部署” → “新建部署” → 类型选择“Web 应用”。
  7. 执行身份：我；访问权限：任何人。
  8. 部署后复制 Web App 网址，粘贴到 index.html 里的 API_URL。
*/

const SPREADSHEET_ID = "请在这里填写你的 Google 表格 ID";
const SHEET_NAME = "预约记录";
const CALENDAR_ID = "primary";
const DEVICE_NAME = "循环回流式风洞设备";
const MANAGER_NAME = "胡家鑫";
const MANAGER_PHONE = "18627506509";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const validation = validateData(data);
    if (!validation.success) return jsonOutput(validation);

    const start = buildDateTime(data.date, data.startTime);
    const end = buildDateTime(data.date, data.endTime);

    if (end <= start) {
      return jsonOutput({ success: false, message: "预约失败：结束时间必须晚于开始时间。" });
    }

    const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    const conflicts = calendar.getEvents(start, end, { search: DEVICE_NAME });

    if (conflicts.length > 0) {
      saveRecord(data, start, end, "预约失败：该时段已有预约");
      return jsonOutput({ success: false, message: "预约失败：该时段已有预约，请更换时间。" });
    }

    const eventTitle = DEVICE_NAME + "预约 - " + data.name;
    const description =
      "设备名称：" + DEVICE_NAME + "\n" +
      "预约人：" + data.name + "\n" +
      "所属课题组/单位：" + data.group + "\n" +
      "联系方式：" + data.phone + "\n" +
      "实验内容：" + data.experiment + "\n" +
      "使用前检查：" + data.checks + "\n" +
      "备注：" + (data.note || "无") + "\n\n" +
      "设备管理人：" + MANAGER_NAME + "\n" +
      "联系电话：" + MANAGER_PHONE;

    calendar.createEvent(eventTitle, start, end, { description: description });
    saveRecord(data, start, end, "预约成功");

    return jsonOutput({ success: true, message: "预约成功。请按预约时间使用设备，并现场填写使用记录。" });
  } catch (error) {
    return jsonOutput({ success: false, message: "系统错误：" + error.message });
  }
}

function doGet() {
  return HtmlService.createHtmlOutput("循环回流式风洞设备预约系统后端运行正常。");
}

function validateData(data) {
  const requiredFields = [
    ["name", "预约人姓名"],
    ["group", "所属课题组/单位"],
    ["phone", "联系方式"],
    ["date", "使用日期"],
    ["startTime", "开始时间"],
    ["endTime", "结束时间"],
    ["experiment", "实验内容"],
    ["checks", "使用前检查"]
  ];

  for (const item of requiredFields) {
    const key = item[0];
    const label = item[1];
    if (!data[key] || String(data[key]).trim() === "") {
      return { success: false, message: "预约失败：请填写“" + label + "”。" };
    }
  }
  return { success: true };
}

function buildDateTime(dateText, timeText) {
  const parts = dateText.split("-");
  const timeParts = timeText.split(":");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), Number(timeParts[0]), Number(timeParts[1]), 0, 0);
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "提交时间", "预约状态", "设备名称", "使用日期", "开始时间", "结束时间",
      "预约人姓名", "所属课题组/单位", "联系方式", "实验内容", "使用前检查", "备注"
    ]);
  }
  return sheet;
}

function saveRecord(data, start, end, status) {
  const sheet = getSheet();
  sheet.appendRow([
    new Date(), status, DEVICE_NAME, data.date, data.startTime, data.endTime,
    data.name, data.group, data.phone, data.experiment, data.checks, data.note || ""
  ]);
}

function jsonOutput(object) {
  return ContentService.createTextOutput(JSON.stringify(object)).setMimeType(ContentService.MimeType.JSON);
}
