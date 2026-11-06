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

    // 2. หากส่งชุดข้อมูล masterData มาด้วย ให้อัปเดตตาราง Media_Data ทั้งแผ่นทันที
    if (masterData && masterData.length > 0) {
      if (dataSheet.getLastRow() > 1) {
        dataSheet.getRange(2, 1, dataSheet.getLastRow() - 1, 20).clearContent();
      }
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
      dataSheet.getRange(2, 1, rows.length, 20).setValues(rows);
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
