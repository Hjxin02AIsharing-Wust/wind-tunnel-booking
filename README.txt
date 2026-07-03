循环回流式风洞设备预约网站部署说明

本文件夹包含：
1. index.html：预约网站前端页面。
2. Code.gs：Google Apps Script 后端代码。
3. README.txt：部署说明。

一、功能

该网站用于“循环回流式风洞设备”预约管理，支持：
1. 预约人填写姓名、课题组、联系方式、使用日期、开始时间、结束时间、实验内容等信息。
2. 自动判断预约时间是否与已有预约冲突。
3. 预约成功后写入 Google 表格。
4. 预约成功后写入 Google 日历，便于管理人员查看设备排期。
5. 可将前端网页部署为公开访问网址，生成二维码贴在设备旁。

二、部署 Google Apps Script 后端

1. 打开 Google Drive，新建一个 Google 表格。
2. 将表格命名为：循环回流式风洞设备预约记录。
3. 复制表格网址中的表格 ID。
   例如：
   https://docs.google.com/spreadsheets/d/这里就是表格ID/edit
4. 在表格中点击：扩展程序 → Apps Script。
5. 删除默认代码，粘贴 Code.gs 中的全部内容。
6. 将 Code.gs 里的 SPREADSHEET_ID 改成你的表格 ID。
7. 如需使用专门的设备日历，可把 CALENDAR_ID 改成设备日历 ID；否则保留 primary。
8. 点击“部署” → “新建部署”。
9. 类型选择“Web 应用”。
10. 执行身份选择“我”。
11. 访问权限选择“任何人”。
12. 点击部署并授权。
13. 复制部署生成的 Web App 网址。

三、配置前端网页

1. 打开 index.html。
2. 找到：
   const API_URL = "请在这里粘贴你的 Google Apps Script Web App 网址";
3. 将引号中的内容替换为刚才复制的 Web App 网址。
4. 保存 index.html。

四、发布为免费网址

推荐方式：GitHub Pages

1. 注册或登录 GitHub。
2. 新建公开仓库，例如：wind-tunnel-booking。
3. 上传修改好的 index.html。
4. 打开仓库 Settings → Pages。
5. Source 选择 Deploy from a branch。
6. Branch 选择 main，目录选择 /root。
7. 保存后，GitHub 会生成网址，例如：
   https://你的用户名.github.io/wind-tunnel-booking/

也可以使用 Netlify、Cloudflare Pages 等免费静态网站托管平台。

五、设备旁二维码文字建议

循环回流式风洞设备预约入口

使用前请先扫码预约。
预约成功后方可使用。
如遇异常，请立即停止使用并联系设备管理人员。

设备管理人：胡家鑫
联系电话：18627506509

六、注意事项

1. 静态网页本身不能可靠地实现多人预约冲突判断，必须配合 Google Apps Script 后端。
2. Google 表格负责保存预约记录。
3. Google 日历负责保存设备排期。
4. 纸质《使用记录登记表》建议继续保留，用于现场签字、异常处理和清洁复位确认。
