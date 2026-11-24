/**
 * ============================================================================
 * 🤖 STATIC MEDIA RELOCATION TRACKER - GOOGLE APPS SCRIPT API (GATE LEVEL 4)
 * ============================================================================
 * วิธีติดตั้ง (ใช้เวลา 1 นาที):
 * 1. สร้างไฟล์ Google Sheets ใหม่ใน Google Drive ของคุณ (ตั้งชื่อเช่น "Media_Relocation_Cloud_DB")
 * 2. ไปที่เมนู ส่วนขยาย (Extensions) > Apps Script
 * 3. ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดไฟล์นี้ลงไป -> กดปุ่ม 💾 บันทึก (Save)
 * 4. กดปุ่ม การทำให้ใช้งานได้ (Deploy) > รายการใหม่ (New deployment)
 * 5. เลือกประเภท (Select type) = เว็บแอป (Web app)
 *    - ดำเนินการในฐานะ (Execute as): ฉัน (Me)
 *    - ผู้ที่มีสิทธิ์เข้าถึง (Who has access): ทุกคน (Anyone)  <-- สำคัญมาก!
 * 6. กด Deploy -> อนุญาตสิทธิ์ (Authorize access) -> คัดลอก Web App URL (ลงท้ายด้วย /exec)
 * 7. นำ Web App URL ไปวางในแท็บ "🤖 AI Integrator (Level 4) & Google Drive Log" บนหน้าเว็บแอป
 * ============================================================================
 */

const SHEET_DATA_NAME = 'Media_Data';
const SHEET_LOG_NAME = 'History_Log';

/**
 * สร้างตาราง Media_Data และ History_Log อัตโนมัติหากยังไม่มีในไฟล์ Google Sheet
 */
function ensureSheetsExist() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. ตาราง History_Log (เก็บหลักฐานการทำงานอัตโนมัติ Gate L4.2 & L4.5)
  let logSheet = ss.getSheetByName(SHEET_LOG_NAME);
  if (!logSheet) {
    logSheet = ss.insertSheet(SHEET_LOG_NAME);
    logSheet.appendRow([
      'Timestamp',
      'Action_Type',
      'Actor',
      'Media_ID',
      'Summary_Detail',
      'Total_Records_Count',
      'Snapshot_JSON'
    ]);
    logSheet.getRange('A1:G1').setFontWeight('bold').setBackground('#1e1b4b').setFontColor('#ffffff');
    logSheet.setFrozenRows(1);
  }

  // 2. ตาราง Media_Data (เก็บข้อมูลป้ายทั้งหมดแบบ Real-time)
  let dataSheet = ss.getSheetByName(SHEET_DATA_NAME);
  if (!dataSheet) {
    dataSheet = ss.insertSheet(SHEET_DATA_NAME);
    dataSheet.appendRow([
      'ID', 'Media_ID', 'Media_Type', 'Company',
      'Origin_Site', 'Origin_Area', 'Dest_Site', 'Dest_Area',
      'Dismantle_Date', 'Install_Date', 'SLA_Downtime_Days',
      'Cause_Category', 'Cause_Detail',
      'Direct_Cost', 'Opportunity_Loss', 'Total_Impact',
      'Status', 'Pending_Stage', 'Year', 'Month'
    ]);
    dataSheet.getRange('A1:T1').setFontWeight('bold').setBackground('#064e3b').setFontColor('#ffffff');
    dataSheet.setFrozenRows(1);
  }

  return { ss, dataSheet, logSheet };
}

/**
 * GET API: ดึงข้อมูลป้ายล่าสุด + ประวัติ History_Log 50 รายการล่าสุดกลับไปยังหน้าเว็บแอป
 */
function doGet(e) {
  try {
    const { dataSheet, logSheet } = ensureSheetsExist();

    // อ่านข้อมูล Media_Data
    const dataRows = dataSheet.getDataRange().getValues();
    let masterData = [];
    if (dataRows.length > 1) {
      masterData = dataRows.slice(1).map(r => ({
        id: String(r[0] || ''),
        mediaId: String(r[1] || ''),
        mediaType: String(r[2] || 'Cookies'),
        company: String(r[3] || ''),
        originSite: String(r[4] || ''),
        originArea: String(r[5] || ''),
        destSite: String(r[6] || ''),
        destArea: String(r[7] || ''),
        dismantleDate: r[8] ? String(r[8]) : null,
        installDate: r[9] ? String(r[9]) : null,
        downtimeDays: Number(r[10] || 0),
        causeCategory: String(r[11] || ''),
        causeDetail: String(r[12] || ''),
        directCost: Number(r[13] || 0),
        opportunityLoss: Number(r[14] || 0),
        totalImpact: Number(r[15] || 0),
        status: String(r[16] || 'Pending'),
        pendingStage: String(r[17] || ''),
        year: Number(r[18] || 2026),
        month: Number(r[19] || 8)
      }));
    }

    // อ่านข้อมูล History_Log ล่าสุด 50 รายการ
    const logRows = logSheet.getDataRange().getValues();
    let logs = [];
    if (logRows.length > 1) {
      logs = logRows.slice(1).reverse().slice(0, 50).map(r => ({
        timestamp: String(r[0] || ''),
        actionType: String(r[1] || ''),
        actor: String(r[2] || ''),
        mediaId: String(r[3] || ''),
        detail: String(r[4] || ''),
        totalCount: Number(r[5] || 0)
      }));
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'ok',
        masterData: masterData,
        logs: logs,
        updatedAt: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * POST API: รับข้อมูลจากเว็บแอป / AI Pipeline บันทึกลง History_Log และอัปเดตตาราง Media_Data
 */
function doPost(e) {
  try {
    const { dataSheet, logSheet } = ensureSheetsExist();
    const payload = JSON.parse(e.postData.contents || '{}');

    // ตรวจสอบ Action พิเศษ: ส่งอีเมลสรุปผู้บริหารอัตโนมัติ (L4/L5 Executive Email Digest)
    if (payload.action === 'send_email_digest' || payload.actionType === 'SEND_EMAIL_DIGEST') {
      const targetEmails = payload.emails || payload.email || payload.targetEmail || DEFAULT_RECIPIENT_EMAILS || Session.getActiveUser().getEmail();
      const emailResult = sendExecutiveEmailReport(targetEmails);
      return ContentService
        .createTextOutput(JSON.stringify(emailResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    const actionType = payload.actionType || 'SYNC_DATA';
    const actor = payload.actor || 'WebApp_User';
    const mediaId = payload.mediaId || '-';
    const detail = payload.detail || 'อัปเดตข้อมูลผ่านระบบอัตโนมัติ';
    const masterData = Array.isArray(payload.masterData) ? payload.masterData : null;
    const totalCount = masterData ? masterData.length : (payload.totalCount || 0);

    // 1. บันทึกแถวใหม่ลงใน History_Log ทุกครั้งที่มี Action
    logSheet.appendRow([
      timestamp,
      actionType,
      actor,
      mediaId,
      detail,
      totalCount,
      payload.recordSnapshot ? JSON.stringify(payload.recordSnapshot) : ''
    ]);

    // 2. การอัปเดตข้อมูลตาราง Media_Data อย่างปลอดภัย (Smart Merge Guardrail)
    if (actionType === 'MANUAL_FULL_SYNC' && masterData && masterData.length > 0) {
      // ดึงข้อมูลเดิมที่มีอยู่ใน Google Sheet ก่อน เพื่อป้องกันข้อมูลสูญหาย (Stale Overwrite Protection)
      const existingData = dataSheet.getDataRange().getValues();
      let preservedMissingRecords = [];
      
      if (existingData.length > 1) {
        const incomingIds = new Set(masterData.map(item => String(item.mediaId || item.id).trim().toUpperCase()));
        for (let r = 1; r < existingData.length; r++) {
          const rowMediaId = String(existingData[r][1] || '').trim().toUpperCase();
          const rowId = String(existingData[r][0] || '').trim().toUpperCase();
          // หากป้ายในชีตมีอยู่แล้ว แต่ในชุดข้อมูลที่เครื่องลูกส่งมาไม่มี (เช่น DS 211) ให้รักษาของเดิมไว้ ไม่ให้ถูกลบทับเด็ดขาด!
          if (rowMediaId && !incomingIds.has(rowMediaId) && !incomingIds.has(rowId)) {
            preservedMissingRecords.push(existingData[r]);
          }
        }
      }

      // ล้างเฉพาะแถวข้อมูลเก่าเพื่อเขียนชุดที่อัปเดต
      if (dataSheet.getLastRow() > 1) {
        dataSheet.getRange(2, 1, dataSheet.getLastRow() - 1, 20).clearContent();
      }

      // แปลงชุดข้อมูลใหม่เป็นแถว
      const rows = masterData.map(item => [
        item.id || '',
        item.mediaId || '',
        item.mediaType || '',
        item.company || '',
        item.originSite || '',
        item.originArea || '',
        item.destSite || '',
        item.destArea || '',
        item.dismantleDate || '',
        item.installDate || '',
        item.downtimeDays || 0,
        item.causeCategory || '',
        item.causeDetail || '',
        item.directCost || 0,
        item.opportunityLoss || 0,
        item.totalImpact || 0,
        item.status || 'Pending',
        item.pendingStage || '',
        item.year || 2026,
        item.month || 8
      ]);

      // นำรายการป้ายที่ถูกรักษาไว้ (Preserved Records) มาต่อท้ายอัตโนมัติ
      preservedMissingRecords.forEach(pr => {
        rows.push(pr);
      });

      dataSheet.getRange(2, 1, rows.length, 20).setValues(rows);
    } else if (payload.newRecord) {
      // เพิ่มเฉพาะ 1 รายการใหม่ (Atomic Append) ปลอดภัย 100% ไม่แตะต้องแถวอื่น
      const nr = payload.newRecord;
      dataSheet.appendRow([
        nr.id || ('REL-' + Date.now()),
        nr.mediaId || '',
        nr.mediaType || 'Cookies',
        nr.company || 'บริษัท แพลน บี มีเดีย จำกัด (มหาชน)',
        nr.originSite || '',
        nr.originArea || '',
        nr.destSite || '',
        nr.destArea || '',
        nr.dismantleDate || '',
        nr.installDate || '',
        nr.downtimeDays || 0,
        nr.causeCategory || '',
        nr.causeDetail || '',
        nr.directCost || 0,
        nr.opportunityLoss || 0,
        nr.totalImpact || 0,
        nr.status || 'Pending',
        nr.pendingStage || '',
        nr.year || 2026,
        nr.month || 8
      ]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'ok',
        loggedAt: timestamp,
        actionType: actionType,
        totalRecords: totalCount
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ============================================================================
 * 📧 AUTOMATED EXECUTIVE EMAIL DIGEST (GATE LEVEL 4.1 & LEVEL 5)
 * ============================================================================
 * ฟังก์ชันสร้างและส่งอีเมลสรุปผู้บริหารอัตโนมัติ (Executive Relocation Digest)
 * รองรับทั้งการเรียกผ่าน Webhook API จากหน้าเว็บ และการตั้งเวลาส่งอัตโนมัติ (Time-Driven Trigger)
 */

// ⚙️ กำหนดอีเมลผู้รับเริ่มต้น (สามารถใส่หลายอีเมลคั่นด้วยเครื่องหมายจุลภาค , ได้)
const DEFAULT_RECIPIENT_EMAILS = 'wasu.sa@planbmedia.co.th, anucha@planbmedia.co.th';

function sendExecutiveEmailReport(targetEmails) {
  const { dataSheet, logSheet } = ensureSheetsExist();
  
  // แปลงและแยกรายชื่อผู้รับ รองรับทั้ง Array, Comma-separated string หรือ Email เดี่ยว
  let emailList = [];
  if (Array.isArray(targetEmails)) {
    emailList = targetEmails.map(e => String(e).trim()).filter(e => e.length > 0 && e.includes('@'));
  } else if (typeof targetEmails === 'string') {
    emailList = targetEmails.split(',').map(e => e.trim()).filter(e => e.length > 0 && e.includes('@'));
  }

  if (emailList.length === 0) {
    const fallback = DEFAULT_RECIPIENT_EMAILS || Session.getActiveUser().getEmail();
    if (fallback) {
      emailList = fallback.split(',').map(e => e.trim()).filter(e => e.length > 0 && e.includes('@'));
    }
  }

  // กำจัดอีเมลที่ซ้ำกัน (Deduplicate)
  emailList = Array.from(new Set(emailList));

  if (emailList.length === 0) {
    return { status: 'error', message: 'ไม่พบที่อยู่อีเมลผู้รับ กรุณาระบุอีเมล' };
  }

  // 1. อ่านและประมวลผลสถิติภาพรวมจาก Media_Data
  const dataRows = dataSheet.getDataRange().getValues();
  let totalSigns = 0;
  let completedSigns = 0;
  let pendingSigns = 0;
  let totalDirectCost = 0;
  let totalImpact = 0;
  let pendingItems = [];

  if (dataRows.length > 1) {
    const rows = dataRows.slice(1);
    totalSigns = rows.length;
    rows.forEach(r => {
      const status = String(r[16] || '').trim();
      const directCost = Number(r[13]) || 0;
      const impact = Number(r[15]) || 0;
      totalDirectCost += directCost;
      totalImpact += impact;

      if (status === 'ติดตั้งสำเร็จ' || status === 'Completed') {
        completedSigns++;
      } else {
        pendingSigns++;
        pendingItems.push({
          mediaId: String(r[1] || '-'),
          mediaType: String(r[2] || '-'),
          location: String(r[4] || '') + ' (' + String(r[5] || '') + ')',
          dest: String(r[6] || '') + ' (' + String(r[7] || '') + ')',
          status: status || 'Pending',
          cost: directCost,
          impact: impact,
          cause: String(r[12] || r[11] || '-')
        });
      }
    });
  }

  // เรียงลำดับป้ายค้างตามมูลค่างบประมาณทางตรงสูงสุด 5 รายการ
  pendingItems.sort((a, b) => b.cost - a.cost);
  const topPending = pendingItems.slice(0, 5);

  // 2. ดึง 3 ประวัติการเปลี่ยนแปลงล่าสุดจาก History_Log
  const logRows = logSheet.getDataRange().getValues();
  let recentLogs = [];
  if (logRows.length > 1) {
    recentLogs = logRows.slice(1).reverse().slice(0, 3).map(r => ({
      time: String(r[0] || ''),
      action: String(r[1] || ''),
      actor: String(r[2] || ''),
      detail: String(r[4] || '')
    }));
  }

  const reportDate = new Date().toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const reportTime = new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' });

  // 3. ประกอบ HTML Email Template แบบ Responsive สวยงามระดับ Executive
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0b1120; margin: 0; padding: 20px 10px; color: #f8fafc; }
        .wrapper { max-width: 660px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #334155; }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 30px 24px; text-align: center; border-bottom: 2px solid #0284c7; }
        .badge { display: inline-block; background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; color: #38bdf8; font-size: 11px; font-weight: bold; letter-spacing: 1px; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; margin-bottom: 12px; }
        .title { margin: 0; color: #ffffff; font-size: 21px; font-weight: 800; line-height: 1.35; }
        .subtitle { margin-top: 8px; color: #94a3b8; font-size: 13px; }
        .content { padding: 26px 24px; }
        .grid { display: table; width: 100%; table-layout: fixed; margin-bottom: 24px; }
        .grid-cell { display: table-cell; width: 25%; padding: 4px; }
        .kpi-card { background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 12px 6px; text-align: center; }
        .kpi-val { font-size: 19px; font-weight: 800; margin-bottom: 4px; }
        .kpi-lbl { font-size: 10.5px; color: #94a3b8; text-transform: uppercase; font-weight: 600; }
        .section-title { font-size: 14.5px; font-weight: 700; color: #38bdf8; margin: 22px 0 10px; border-bottom: 1px solid #334155; padding-bottom: 6px; }
        .table-wrap { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 12px; }
        .table-wrap th { background: #0f172a; color: #94a3b8; font-weight: 700; text-align: left; padding: 10px 8px; border-bottom: 1px solid #334155; }
        .table-wrap td { padding: 10px 8px; border-bottom: 1px solid #334155; color: #cbd5e1; }
        .risk-pill { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10.5px; font-weight: 700; }
        .risk-high { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; }
        .risk-med { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b; }
        .log-item { background: #0f172a; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; font-size: 12px; border-left: 3px solid #0284c7; }
        .btn-cta { display: block; width: 85%; margin: 26px auto 6px; background: linear-gradient(135deg, #0284c7, #00a8e8); color: #ffffff !important; text-decoration: none; text-align: center; padding: 13px 20px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 15px rgba(2, 132, 199, 0.4); }
        .footer { text-align: center; font-size: 11px; color: #64748b; padding: 18px; border-top: 1px solid #334155; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <div class="badge">PLAN B MEDIA • AI LITERACY GATE L4/L5</div>
          <h1 class="title">รายงานสรุปสถานะการรื้อย้ายป้ายโฆษณา (Executive Relocation Digest)</h1>
          <div class="subtitle">ข้อมูลประมวลผล ณ วันที่ ${reportDate} เวลา ${reportTime} น. (ระบบอัตโนมัติ)</div>
        </div>

        <div class="content">
          <!-- 4 KPI Metrics -->
          <div class="grid">
            <div class="grid-cell">
              <div class="kpi-card">
                <div class="kpi-val" style="color: #38bdf8;">${totalSigns}</div>
                <div class="kpi-lbl">ป้ายทั้งหมด</div>
              </div>
            </div>
            <div class="grid-cell">
              <div class="kpi-card">
                <div class="kpi-val" style="color: #10b981;">${completedSigns}</div>
                <div class="kpi-lbl">ติดตั้งสำเร็จ</div>
              </div>
            </div>
            <div class="grid-cell">
              <div class="kpi-card">
                <div class="kpi-val" style="color: #f59e0b;">${pendingSigns}</div>
                <div class="kpi-lbl">ค้างดำเนินการ</div>
              </div>
            </div>
            <div class="grid-cell">
              <div class="kpi-card">
                <div class="kpi-val" style="color: #ef4444;">฿${(totalDirectCost / 1000000).toFixed(2)}M</div>
                <div class="kpi-lbl">งบทางตรงรวม</div>
              </div>
            </div>
          </div>

          <!-- Priority Pending Action Items -->
          <div class="section-title">🚨 รายการป้ายค้างดำเนินการเร่งด่วน (Top Priority Pending)</div>
          <table class="table-wrap">
            <thead>
              <tr>
                <th>รหัสป้าย / สื่อ</th>
                <th>สถานที่ / ปลายทาง</th>
                <th>งบประมาณ</th>
                <th>สถานะ / สาเหตุ</th>
              </tr>
            </thead>
            <tbody>
              ${topPending.map(item => `
                <tr>
                  <td><strong>${item.mediaId}</strong><br><span style="font-size:11px;color:#94a3b8;">${item.mediaType}</span></td>
                  <td>${item.location}<br><span style="font-size:11px;color:#94a3b8;">➔ ${item.dest}</span></td>
                  <td style="color:#f59e0b;font-weight:bold;">฿${Number(item.cost).toLocaleString()}</td>
                  <td>
                    <span class="risk-pill ${item.cost >= 300000 ? 'risk-high' : 'risk-med'}">${item.status}</span>
                    <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${item.cause}</div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Recent Audit Trail -->
          <div class="section-title">📅 ประวัติการดำเนินการล่าสุด (Audit Trail Snapshot)</div>
          ${recentLogs.map(l => `
            <div class="log-item">
              <strong style="color:#38bdf8;">[${l.action}]</strong> โดย <em>${l.actor}</em> เมื่อ ${l.time}<br>
              <span style="color:#cbd5e1;">${l.detail}</span>
            </div>
          `).join('')}

          <!-- Action Button -->
          <a href="https://media-relocation-tracker.netlify.app" class="btn-cta">
            🌐 เข้าสู่ระบบ Live Executive Dashboard
          </a>
        </div>

        <div class="footer">
          อีเมลนี้ถูกสร้างและจัดส่งโดยระบบอัตโนมัติ Google Apps Script + AI Gate Workflow Integrator<br>
          บริษัท แพลน บี มีเดีย จำกัด (มหาชน) • ความปลอดภัยระดับ Enterprise
        </div>
      </div>
    </body>
    </html>
  `;

  // 4. สั่งส่งอีเมลผ่าน MailApp แบบแยกผู้รับรายบุคคล (Individual Dispatch)
  // เพื่อรักษาความเป็นส่วนตัว (Privacy) แต่ละท่านจะไม่เห็นรายชื่ออีเมลของผู้อื่น และป้องกันปัญหาอีเมลตกหล่น
  const sentRecipients = [];
  const failedRecipients = [];

  emailList.forEach(recipient => {
    try {
      MailApp.sendEmail({
        to: recipient,
        subject: `📊 [Plan B AI Gate] รายงานสรุปสถานะการรื้อย้ายป้ายโฆษณา (${reportDate})`,
        htmlBody: htmlBody
      });
      sentRecipients.push(recipient);
    } catch (err) {
      Logger.log(`ส่งอีเมลไปยัง ${recipient} ไม่สำเร็จ: ` + err.message);
      failedRecipients.push({ email: recipient, error: err.message });
    }
  });

  // 5. บันทึกประวัติการส่งลง History_Log
  const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  const recipientSummary = sentRecipients.join(', ');
  logSheet.appendRow([
    timestamp,
    'EMAIL_EXECUTIVE_DIGEST',
    'Auto_Reporter (L4/L5)',
    'ALL_75_SIGNS',
    `ส่งรายงานสรุปผู้บริหารแบบแยกรายบุคคล (Individual Dispatch) ถึง ${sentRecipients.length} ท่าน (${recipientSummary}) สำเร็จ`,
    totalSigns,
    JSON.stringify({ sentRecipients, failedRecipients, pendingCount: pendingSigns, totalCost: totalDirectCost })
  ]);

  return {
    status: sentRecipients.length > 0 ? 'ok' : 'error',
    message: `ส่งรายงานสรุปผู้บริหารไปยัง ${sentRecipients.length} ท่านเรียบร้อยแล้ว (${recipientSummary})`,
    sentRecipients: sentRecipients,
    failedRecipients: failedRecipients,
    sentAt: timestamp
  };
}

/**
 * ฟังก์ชันตั้งเวลาส่งอีเมลสรุปอัตโนมัติทุกสัปดาห์ (ทุกเช้าวันจันทร์ เวลา 08:00 น.)
 * กดรันฟังก์ชันนี้ 1 ครั้งใน Apps Script เพื่อเปิดใช้งานตารางอัตโนมัติ
 */
function setupWeeklyReportTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'sendWeeklyEmailReportAuto') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('sendWeeklyEmailReportAuto')
    .timeBased()
    .everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .create();

  Logger.log('สร้าง Trigger ส่งรายงานทุกเช้าวันจันทร์ 08:00 น. สำเร็จ');
}

/**
 * ฟังก์ชัน Wrapper สำหรับ Time-Driven Trigger
 */
function sendWeeklyEmailReportAuto() {
  const targetEmail = DEFAULT_RECIPIENT_EMAILS || Session.getActiveUser().getEmail();
  sendExecutiveEmailReport(targetEmail);
}

/**
 * ฟังก์ชันสำหรับกดทดสอบส่งอีเมลทันทีในตัวแก้ไข Apps Script
 */
function testSendEmailDigest() {
  const testEmail = DEFAULT_RECIPIENT_EMAILS || Session.getActiveUser().getEmail();
  const res = sendExecutiveEmailReport(testEmail);
  Logger.log(res);
}
