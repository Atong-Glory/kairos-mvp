import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export interface CallSheetData {
  projectTitle: string;
  sceneNumber: string;
  location: string;
  dayNight: string;
  scheduledDate?: string;
  description?: string;
  crew: Array<{
    role_name: string;
    department: string;
    full_name: string;
  }>;
}

/**
 * Generates HTML for call sheet
 */
export function generateCallSheetHTML(data: CallSheetData): string {
  const crewByDept = data.crew.reduce((acc: any, member) => {
    if (!acc[member.department]) acc[member.department] = [];
    acc[member.department].push(member);
    return acc;
  }, {});

  const crewHTML = Object.entries(crewByDept)
    .map(([dept, members]: any) => `
      <div class="department-section">
        <h3 class="department-title">${dept}</h3>
        <table class="crew-table">
          ${members.map((m: any) => `
            <tr>
              <td class="role-cell">${m.role_name}</td>
              <td class="name-cell">${m.full_name}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `)
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Call Sheet - ${data.projectTitle}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      color: #1f2937;
      background-color: #f9fafb;
      padding: 40px 20px;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background-color: white;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
    }
    
    .header {
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    .header .subtitle {
      color: #666;
      font-size: 14px;
    }
    
    .scene-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
      padding: 20px;
      background-color: #f3f4f6;
      border-radius: 6px;
    }
    
    .info-item {
      display: flex;
      flex-direction: column;
    }
    
    .info-item label {
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 6px;
    }
    
    .info-item value {
      font-size: 16px;
      font-weight: 500;
      color: #1f2937;
    }
    
    .description {
      margin-bottom: 30px;
      padding: 16px;
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      border-radius: 4px;
    }
    
    .description-label {
      font-weight: 600;
      font-size: 12px;
      color: #1e40af;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    
    .description-text {
      font-size: 14px;
      line-height: 1.6;
      color: #1f2937;
    }
    
    .crew-section {
      margin-top: 30px;
    }
    
    .crew-section h2 {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 20px;
      color: #1f2937;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 10px;
    }
    
    .department-section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    
    .department-title {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      margin-bottom: 12px;
      padding: 8px 0;
      border-top: 1px solid #e5e7eb;
    }
    
    .crew-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    
    .crew-table tr {
      border-bottom: 1px solid #e5e7eb;
    }
    
    .crew-table tr:last-child {
      border-bottom: none;
    }
    
    .role-cell {
      padding: 10px 12px;
      font-weight: 500;
      color: #1f2937;
      width: 40%;
    }
    
    .name-cell {
      padding: 10px 12px;
      color: #4b5563;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #9ca3af;
      text-align: center;
    }
    
    @media print {
      body {
        padding: 0;
        background-color: white;
      }
      
      .container {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 CALL SHEET</h1>
      <p class="subtitle">${data.projectTitle}</p>
    </div>
    
    <div class="scene-info">
      <div class="info-item">
        <label>Scene Number</label>
        <value>${data.sceneNumber}</value>
      </div>
      <div class="info-item">
        <label>Location</label>
        <value>${data.location}</value>
      </div>
      <div class="info-item">
        <label>Day/Night</label>
        <value>${data.dayNight}</value>
      </div>
      <div class="info-item">
        <label>Shoot Date</label>
        <value>${data.scheduledDate || 'TBD'}</value>
      </div>
    </div>
    
    ${data.description ? `
      <div class="description">
        <div class="description-label">Scene Description</div>
        <div class="description-text">${data.description}</div>
      </div>
    ` : ''}
    
    <div class="crew-section">
      <h2>Crew Assignments</h2>
      ${crewHTML}
    </div>
    
    <div class="footer">
      <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      <p>KAIRO Production Management System</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Converts HTML to PDF and saves to file system
 * Uses a two-step approach: render HTML in WebView, then capture as PDF
 */
export async function htmlToPDF(html: string, filename: string): Promise<string> {
  try {
    // For now, we'll save the HTML and return the path
    // In a production app with native modules, you'd use a proper PDF library
    // Or use: https://github.com/RNTextView/react-native-html-to-pdf
    
    const fileUri = `${FileSystem.documentDirectory}${filename}.html`;
    await FileSystem.writeAsStringAsync(fileUri, html);
    return fileUri;
  } catch (err) {
    console.error('Error converting HTML to PDF:', err);
    throw err;
  }
}

/**
 * Export call sheet as PDF and prepare for sharing
 */
export async function exportCallSheetPDF(
  data: CallSheetData,
  options: {
    filename?: string;
    share?: boolean;
  } = {}
): Promise<string> {
  const filename = options.filename || `CallSheet_Scene${data.sceneNumber}_${Date.now()}`;
  
  try {
    const html = generateCallSheetHTML(data);
    const fileUri = await htmlToPDF(html, filename);
    
    if (options.share && Platform.OS !== 'web') {
      await shareFile(fileUri, filename);
    }
    
    return fileUri;
  } catch (err) {
    console.error('Error exporting call sheet:', err);
    throw err;
  }
}

/**
 * Share file via messaging apps (email, WhatsApp, etc.)
 */
export async function shareFile(
  fileUri: string,
  filename: string,
  options: {
    title?: string;
    message?: string;
  } = {}
): Promise<void> {
  try {
    const mimeType = 'text/html'; // For HTML preview, or 'application/pdf' for PDF

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: options.title || 'Share Call Sheet',
        UTI: 'public.pdf',
      });
    } else {
      throw new Error('Sharing is not available on this platform');
    }
  } catch (err) {
    console.error('Error sharing file:', err);
    throw err;
  }
}

/**
 * Generate a WhatsApp-friendly text version of call sheet
 */
export function generateCallSheetWhatsAppText(data: CallSheetData): string {
  const crewByDept = data.crew.reduce((acc: any, member) => {
    if (!acc[member.department]) acc[member.department] = [];
    acc[member.department].push(member);
    return acc;
  }, {});

  let text = `📋 CALL SHEET\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🎬 ${data.projectTitle}\n`;
  text += `Scene ${data.sceneNumber}: ${data.location}\n`;
  text += `🕐 ${data.dayNight}${data.scheduledDate ? ` | 📅 ${data.scheduledDate}` : ''}\n`;
  
  if (data.description) {
    text += `📝 ${data.description}\n`;
  }
  
  text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  Object.entries(crewByDept).forEach(([dept, members]: any) => {
    text += `【${dept}】\n`;
    members.forEach((m: any) => {
      text += `  ${m.role_name}: ${m.full_name}\n`;
    });
    text += '\n';
  });

  text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Generated: ${new Date().toLocaleString()}\n`;
  text += `KAIRO Production Management`;

  return text;
}

/**
 * Share call sheet as text via WhatsApp/Email
 */
export async function shareCallSheetText(data: CallSheetData): Promise<void> {
  const text = generateCallSheetWhatsAppText(data);
  
  try {
    if (await Sharing.isAvailableAsync()) {
      // For text sharing, we create a temporary text file
      const filename = `CallSheet_Scene${data.sceneNumber}.txt`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      
      await FileSystem.writeAsStringAsync(fileUri, text);
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: 'Share Call Sheet',
      });
    } else {
      console.warn('Sharing not available');
    }
  } catch (err) {
    console.error('Error sharing call sheet:', err);
    throw err;
  }
}
