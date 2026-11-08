import ExcelJS from 'exceljs';
import { storage } from './storage';
import { ShopifyAppRecord, CrawlErrorRecord } from '../src/types';

export async function generateExcelWorkbook(verifiedOnly: boolean = false): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Shopify App Directory Crawler';
  workbook.created = new Date();
  workbook.modified = new Date();

  const allRecords = storage.getAllRecords();
  const records = verifiedOnly
    ? allRecords.filter((r) => r.status === 'Verified' || r.status === 'Partially Verified')
    : allRecords;

  const state = storage.getState();
  const stats = state.stats;
  const config = state.config;
  const errors = storage.getErrors();

  // ==========================================
  // SHEET 1: All Apps
  // ==========================================
  const sheet1 = workbook.addWorksheet('All Apps', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  const columns = [
    { header: 'Shopify App Name', key: 'appName', width: 32 },
    { header: 'Rating', key: 'rating', width: 12 },
    { header: 'Primary Category', key: 'primaryCategory', width: 26 },
    { header: 'Secondary Category', key: 'secondaryCategory', width: 26 },
    { header: 'Developer Name', key: 'devName', width: 28 },
    { header: 'Developer Address', key: 'devAddress', width: 45 },
    { header: 'Developer Website', key: 'devWebsite', width: 35 },
    { header: 'Launched Date', key: 'launchDate', width: 18 },
    { header: 'SASI App URL', key: 'sasiUrl', width: 40 },
    { header: 'Shopify App Store URL', key: 'shopifyUrl', width: 45 },
    { header: 'Source Verification Status', key: 'status', width: 24 },
    { header: 'Notes', key: 'notes', width: 40 },
    { header: 'Directory Page Number', key: 'pageNum', width: 22 },
    { header: 'Position on Directory Page', key: 'posOnPage', width: 26 },
    { header: 'Overall Discovery Order', key: 'overallOrder', width: 24 },
    { header: 'Last Verified Date', key: 'lastVerifiedDate', width: 24 },
  ];

  sheet1.columns = columns;

  // Header styling
  const headerRow = sheet1.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }, // Slate 800
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  // Populate data rows
  records.forEach((record, idx) => {
    const rowNum = idx + 2;
    const row = sheet1.addRow({
      appName: record.appName || '-',
      rating: typeof record.rating === 'number' ? record.rating : parseFloat(String(record.rating)) || '-',
      primaryCategory: record.primaryCategory || '-',
      secondaryCategory: record.secondaryCategory || '-',
      devName: record.devName || '-',
      devAddress: record.devAddress || '-',
      devWebsite: record.devWebsite && record.devWebsite !== '-'
        ? { text: record.devWebsite, hyperlink: record.devWebsite }
        : '-',
      launchDate: record.launchDate || '-',
      sasiUrl: record.sasiUrl ? { text: record.sasiUrl, hyperlink: record.sasiUrl } : '-',
      shopifyUrl: record.shopifyUrl ? { text: record.shopifyUrl, hyperlink: record.shopifyUrl } : '-',
      status: record.status || '-',
      notes: record.notes || '-',
      pageNum: record.pageNum,
      posOnPage: record.posOnPage,
      overallOrder: record.overallOrder,
      lastVerifiedDate: record.lastVerifiedDate,
    });

    row.height = 22;
    // Alignments and wrapping
    row.getCell('devAddress').alignment = { wrapText: true, vertical: 'middle' };
    row.getCell('notes').alignment = { wrapText: true, vertical: 'middle' };
    row.getCell('rating').alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell('pageNum').alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell('posOnPage').alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell('overallOrder').alignment = { horizontal: 'right', vertical: 'middle' };

    // Format hyperlinks blue & underlined
    ['devWebsite', 'sasiUrl', 'shopifyUrl'].forEach((k) => {
      const cell = row.getCell(k);
      if (cell.value && typeof cell.value === 'object' && 'hyperlink' in cell.value) {
        cell.font = { color: { argb: 'FF2563EB' }, underline: true };
      }
    });

    // Alternate row shading
    if (idx % 2 === 1) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        if (!cell.fill || (cell.fill as any).type !== 'pattern') {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' }, // Slate 50
          };
        }
      });
    }

    // Border
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  // Enable AutoFilter for Sheet 1
  sheet1.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(records.length + 1, 1), column: columns.length },
  };

  // ==========================================
  // SHEET 2: Grouped Developers (Consolidated by Company)
  // ==========================================
  const sheetDevs = workbook.addWorksheet('Grouped Developers', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  const devColumns = [
    { header: 'Developer / Company Name', key: 'devName', width: 34 },
    { header: 'Total Apps Owned', key: 'appCount', width: 18 },
    { header: 'Average App Rating', key: 'avgRating', width: 18 },
    { header: 'Developer Website', key: 'devWebsite', width: 35 },
    { header: 'Developer Business Address', key: 'devAddress', width: 50 },
    { header: 'Specialized Categories', key: 'categories', width: 40 },
    { header: 'Apps Portfolio (Names & Ratings)', key: 'appsList', width: 65 },
    { header: 'Shopify App Store URLs', key: 'shopifyUrls', width: 65 },
    { header: 'Multiple Apps Flag', key: 'hasMultipleApps', width: 20 },
    { header: 'Last Verified Date', key: 'lastVerifiedDate', width: 24 },
  ];

  sheetDevs.columns = devColumns;

  // Header styling
  const devHeaderRow = sheetDevs.getRow(1);
  devHeaderRow.height = 28;
  devHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF065F46' }, // Deep Emerald 800
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF064E3B' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  const groupedDevs = storage.getAllGroupedDevelopers();
  groupedDevs.forEach((dev, idx) => {
    const appsListStr = dev.apps.map((a) => `${a.appName} (${a.rating}★)`).join('; ');
    const shopifyUrlsStr = dev.apps.map((a) => a.shopifyUrl).join('; ');

    const row = sheetDevs.addRow({
      devName: dev.devName,
      appCount: dev.appCount,
      avgRating: dev.avgRating,
      devWebsite: dev.devWebsite !== '-' ? { text: dev.devWebsite, hyperlink: dev.devWebsite } : '-',
      devAddress: dev.devAddress,
      categories: dev.categories.join(', ') || '-',
      appsList: appsListStr,
      shopifyUrls: shopifyUrlsStr,
      hasMultipleApps: dev.hasMultipleApps ? 'Yes (Multi-App Developer)' : 'Single App',
      lastVerifiedDate: dev.lastVerifiedDate,
    });

    row.height = dev.appCount > 1 ? 28 : 22;
    row.getCell('devAddress').alignment = { wrapText: true, vertical: 'middle' };
    row.getCell('categories').alignment = { wrapText: true, vertical: 'middle' };
    row.getCell('appsList').alignment = { wrapText: true, vertical: 'middle' };
    row.getCell('shopifyUrls').alignment = { wrapText: true, vertical: 'middle' };
    row.getCell('appCount').alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell('avgRating').alignment = { horizontal: 'right', vertical: 'middle' };

    // Format website hyperlink
    const webCell = row.getCell('devWebsite');
    if (webCell.value && typeof webCell.value === 'object' && 'hyperlink' in webCell.value) {
      webCell.font = { color: { argb: 'FF2563EB' }, underline: true };
    }

    // Highlight multi-app developers with soft emerald tint
    if (dev.hasMultipleApps) {
      row.getCell('appCount').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD1FAE5' }, // Emerald 100
      };
      row.getCell('appCount').font = { bold: true, color: { argb: 'FF065F46' } };
    } else if (idx % 2 === 1) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        if (!cell.fill || (cell.fill as any).type !== 'pattern') {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        }
      });
    }

    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  sheetDevs.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(groupedDevs.length + 1, 1), column: devColumns.length },
  };

  // ==========================================
  // SHEET 3: Crawl Summary
  // ==========================================
  const sheet2 = workbook.addWorksheet('Crawl Summary');
  sheet2.columns = [
    { header: 'Metric / Parameter', key: 'metric', width: 35 },
    { header: 'Value', key: 'value', width: 50 },
    { header: 'Details / Description', key: 'detail', width: 45 },
  ];

  const summaryHeader = sheet2.getRow(1);
  summaryHeader.height = 26;
  summaryHeader.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }; // Teal 700
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const summaryData = [
    {
      metric: 'Crawl Start Timestamp',
      value: stats.startTime || 'Not started',
      detail: 'Timestamp when the crawl session commenced',
    },
    {
      metric: 'Crawl Finish Timestamp',
      value: stats.endTime || (stats.status === 'running' ? 'In progress...' : 'N/A'),
      detail: 'Timestamp when crawl reached completion or stopped',
    },
    {
      metric: 'Directory URL',
      value: config.directoryUrl,
      detail: 'Primary discovery URL (SASI Top Reviewed)',
    },
    {
      metric: 'Total Pages Discovered',
      value: stats.totalPagesDiscovered,
      detail: 'Dynamic total pagination pages detected on SASI directory',
    },
    {
      metric: 'Pages Successfully Processed',
      value: stats.pagesCompleted,
      detail: 'Number of pages fully crawled and parsed',
    },
    {
      metric: 'Total Unique Apps Discovered',
      value: stats.appsDiscovered,
      detail: 'App listings discovered across processed directory pages',
    },
    {
      metric: 'Apps Fully Verified',
      value: stats.appsVerified,
      detail: 'Apps with official store data & explicit launch date verified',
    },
    {
      metric: 'Apps Partially Verified',
      value: stats.appsPartiallyVerified,
      detail: 'Apps with official store listing confirmed, launch date not explicitly published',
    },
    {
      metric: 'Apps That Failed',
      value: stats.appsFailed,
      detail: 'Listings that failed extraction or encountered network blocks',
    },
    {
      metric: 'Duplicate Occurrences',
      value: stats.duplicateCount,
      detail: 'Duplicate listings detected & deduplicated by canonical Shopify URL',
    },
    {
      metric: 'Overall Completion Status',
      value: stats.status.toUpperCase(),
      detail: stats.statusMessage,
    },
    {
      metric: 'Unresolved Limitations',
      value: 'Launch dates are omitted on modern Shopify App Store listings; preserved as "-" per instructions',
      detail: 'Shopify App Store redesigned its listing layout to exclude public launch dates',
    },
  ];

  summaryData.forEach((row, i) => {
    const r = sheet2.addRow(row);
    r.height = 22;
    r.getCell('metric').font = { bold: true };
    if (i % 2 === 1) {
      r.eachCell((c) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
      });
    }
  });

  // ==========================================
  // SHEET 3: Crawl Errors
  // ==========================================
  const sheet3 = workbook.addWorksheet('Crawl Errors', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
  });

  sheet3.columns = [
    { header: 'App Name', key: 'appName', width: 28 },
    { header: 'SASI URL', key: 'sasiUrl', width: 40 },
    { header: 'Shopify App Store URL', key: 'shopifyUrl', width: 40 },
    { header: 'Directory Page Number', key: 'pageNum', width: 22 },
    { header: 'Failed Field / Operation', key: 'failedField', width: 26 },
    { header: 'Error Description', key: 'errorDescription', width: 45 },
    { header: 'Number of Attempts', key: 'attempts', width: 20 },
    { header: 'Last Attempt Timestamp', key: 'lastAttemptTimestamp', width: 26 },
    { header: 'Suggested Next Action', key: 'suggestedAction', width: 35 },
  ];

  const errorHeader = sheet3.getRow(1);
  errorHeader.height = 26;
  errorHeader.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } }; // Red 800
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  if (errors.length === 0) {
    const r = sheet3.addRow({
      appName: 'None',
      sasiUrl: '-',
      shopifyUrl: '-',
      pageNum: 0,
      failedField: '-',
      errorDescription: 'No extraction errors recorded during current session.',
      attempts: 0,
      lastAttemptTimestamp: new Date().toISOString(),
      suggestedAction: 'No action required.',
    });
    r.height = 22;
  } else {
    errors.forEach((err, i) => {
      const r = sheet3.addRow({
        appName: err.appName || '-',
        sasiUrl: err.sasiUrl ? { text: err.sasiUrl, hyperlink: err.sasiUrl } : '-',
        shopifyUrl: err.shopifyUrl ? { text: err.shopifyUrl, hyperlink: err.shopifyUrl } : '-',
        pageNum: err.pageNum,
        failedField: err.failedField,
        errorDescription: err.errorDescription,
        attempts: err.attempts,
        lastAttemptTimestamp: err.lastAttemptTimestamp,
        suggestedAction: err.suggestedAction,
      });
      r.height = 22;
      r.getCell('errorDescription').alignment = { wrapText: true };
      if (i % 2 === 1) {
        r.eachCell((c) => {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
        });
      }
    });
  }

  sheet3.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(errors.length + 1, 2), column: 9 },
  };

  // ==========================================
  // SHEET 4: Read Me
  // ==========================================
  const sheet4 = workbook.addWorksheet('Read Me');
  sheet4.columns = [
    { header: 'Section', key: 'section', width: 28 },
    { header: 'Information & Guidelines', key: 'info', width: 90 },
  ];

  const readmeHeader = sheet4.getRow(1);
  readmeHeader.height = 26;
  readmeHeader.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } }; // Indigo 700
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const readmeData = [
    {
      section: 'Dataset Overview',
      info: 'This workbook contains verified Shopify App Store information compiled from the SASI Top Reviewed directory (https://sasi.heymantle.com/top-reviewed) and cross-verified with official Shopify App Store listings (https://apps.shopify.com). Designed for company research, business development, and marketing/SEO recruitment.',
    },
    {
      section: 'Data Sources Used',
      info: '1. Discovery: SASI (The Shopify App Store Index by Mantle) - establishes discovery order and app rank.\n2. Verification: Official Shopify App Store listing for each individual app - extracts canonical name, precise rating, primary & secondary categories, developer name, developer address, and official developer website.',
    },
    {
      section: 'Column Descriptions',
      info: '• Shopify App Name: Official name registered on Shopify.\n• Rating: Numeric rating preserving decimal precision (e.g. 5.0, 4.8).\n• Primary Category: First assigned category on official listing.\n• Secondary Category: Second category if assigned ("-" if none).\n• Developer Name: Developer or company name.\n• Developer Address: Complete physical/business address from the Developer section.\n• Developer Website: Official homepage URL of the developer company.\n• Launched Date: Verified launch date or "-" if not provided by source.\n• SASI & Shopify URLs: Direct hyperlinks to original listings.\n• Source Verification Status: Quality verification badge.\n• Notes: Extraction remarks, missing items, or conflicts.',
    },
    {
      section: 'Verification Status Meanings',
      info: '• "Verified": App name, rating, primary category, developer details, and original launch date verified.\n• "Partially Verified": Official Shopify App Store listing verified for all core business details (name, rating, categories, developer name/address/website), but launch date is not publicly stated on the store page.\n• "Could not be verified": Request or extraction failed; see Crawl Errors sheet.',
    },
    {
      section: 'Missing Values Convention',
      info: 'All genuinely missing values are represented as a standard hyphen ("-"). No values are inferred or fabricated.',
    },
    {
      section: 'Resuming Crawls',
      info: 'The crawler includes durable checkpoint persistence. If a crawl is paused, interrupted, or the server restarts, click "Resume Crawl" in the dashboard to automatically continue from the next uncompleted page without duplicate requests.',
    },
    {
      section: 'Retrying Failed Records',
      info: 'Use the "Retry Failed Apps" button in the dashboard or review the "Crawl Errors" worksheet for actionable remediation steps.',
    },
    {
      section: 'Collection Timestamp',
      info: `Dataset extracted and generated on: ${new Date().toISOString()} (UTC).`,
    },
  ];

  readmeData.forEach((row, i) => {
    const r = sheet4.addRow(row);
    r.height = 42;
    r.getCell('section').font = { bold: true };
    r.getCell('info').alignment = { wrapText: true, vertical: 'middle' };
    if (i % 2 === 1) {
      r.eachCell((c) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
      });
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function generateCsvExport(verifiedOnly: boolean = false): string {
  const allRecords = storage.getAllRecords();
  const records = verifiedOnly
    ? allRecords.filter((r) => r.status === 'Verified' || r.status === 'Partially Verified')
    : allRecords;

  const headers = [
    'Shopify App Name',
    'Rating',
    'Primary Category',
    'Secondary Category',
    'Developer Name',
    'Developer Address',
    'Developer Website',
    'Launched Date',
    'SASI App URL',
    'Shopify App Store URL',
    'Source Verification Status',
    'Notes',
    'Directory Page Number',
    'Position on Directory Page',
    'Overall Discovery Order',
    'Last Verified Date',
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = [headers.map(escapeCsv).join(',')];

  for (const r of records) {
    rows.push(
      [
        r.appName,
        r.rating,
        r.primaryCategory,
        r.secondaryCategory,
        r.devName,
        r.devAddress,
        r.devWebsite,
        r.launchDate,
        r.sasiUrl,
        r.shopifyUrl,
        r.status,
        r.notes,
        r.pageNum,
        r.posOnPage,
        r.overallOrder,
        r.lastVerifiedDate,
      ]
        .map(escapeCsv)
        .join(',')
    );
  }

  return rows.join('\r\n');
}

export function generateErrorsCsv(): string {
  const errors = storage.getErrors();
  const headers = [
    'App Name',
    'SASI URL',
    'Shopify App Store URL',
    'Directory Page Number',
    'Failed Field',
    'Error Description',
    'Attempts',
    'Last Attempt Timestamp',
    'Suggested Next Action',
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = [headers.map(escapeCsv).join(',')];

  for (const e of errors) {
    rows.push(
      [
        e.appName || '-',
        e.sasiUrl || '-',
        e.shopifyUrl || '-',
        e.pageNum,
        e.failedField,
        e.errorDescription,
        e.attempts,
        e.lastAttemptTimestamp,
        e.suggestedAction,
      ]
        .map(escapeCsv)
        .join(',')
    );
  }

  return rows.join('\r\n');
}

export function generateDevelopersCsv(multiOnly: boolean = false): string {
  let developers = storage.getAllGroupedDevelopers();
  if (multiOnly) {
    developers = developers.filter((d) => d.hasMultipleApps);
  }

  const headers = [
    'Developer / Company Name',
    'Total Apps Owned',
    'Average App Rating',
    'Developer Website',
    'Developer Business Address',
    'Specialized Categories',
    'Apps Portfolio (Names & Ratings)',
    'Shopify App Store URLs',
    'Multiple Apps Flag',
    'Last Verified Date',
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = [headers.map(escapeCsv).join(',')];

  for (const d of developers) {
    const appsListStr = d.apps.map((a) => `${a.appName} (${a.rating}★)`).join('; ');
    const urlsStr = d.apps.map((a) => a.shopifyUrl).join('; ');

    rows.push(
      [
        d.devName,
        d.appCount,
        d.avgRating,
        d.devWebsite,
        d.devAddress,
        d.categories.join(', '),
        appsListStr,
        urlsStr,
        d.hasMultipleApps ? 'Yes (Multi-App Developer)' : 'Single App',
        d.lastVerifiedDate,
      ]
        .map(escapeCsv)
        .join(',')
    );
  }

  return rows.join('\r\n');
}
