import { EventEmitter } from 'events';
import { WebClient } from '@slack/web-api';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// 1. CONFIG STORE
// ============================================
class ConfigStore {
  private static instance: ConfigStore;
  private isInitialized = false;
  private slackToken: string = '';
  private defaultChannelName: string = '';
  private defaultChannelId: string = '';
  private slackClient: WebClient | null = null;
  private autoDeleteFiles: boolean = true;
  private tempDir: string = '';

  private constructor() {
    this.tryAutoInitialize();
  }

  static getInstance(): ConfigStore {
    if (!ConfigStore.instance) {
      ConfigStore.instance = new ConfigStore();
    }
    return ConfigStore.instance;
  }

  private tryAutoInitialize(): void {
    // REMOVED HARCODED TOKEN - Use environment variables
    const token = process.env.SLACK_TOKEN_ID;
    const channelName = process.env.CHANNEL_NAME || "";
    const channelId = process.env.CHANNEL_ID || ""; 

    if (token && channelName && channelId) {
      this.initialize(token, channelName, channelId);
      console.log('✅ error-notifier: Auto-initialized from environment variables');
    } else {
      console.log('ℹ️ error-notifier: Not auto-initialized. Call alert.init() to initialize.');
    }
  }

  private initialize(slackToken: string, channelName: string, channelId: string): void {
    if (this.isInitialized) return;

    this.slackToken = slackToken;
    this.defaultChannelName = channelName;
    this.defaultChannelId = channelId;
    this.slackClient = new WebClient(slackToken);

    // Create temp directory for files
    this.tempDir = path.join(__dirname, '..', 'temp-uploads');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    this.isInitialized = true;
  }

  init(
    slackToken: string,
    channelName: string,
    channelId: string,
    options?: { autoDeleteFiles?: boolean }
  ): void {
    if (this.isInitialized) {
      throw new Error('error-notifier: Already initialized!');
    }

    // Validate inputs
    if (!slackToken || !slackToken.startsWith('xoxb-')) {
      throw new Error('error-notifier: Invalid Slack bot token format. Token should start with xoxb-');
    }

    if (!channelName) {
      throw new Error('error-notifier: Channel name is required');
    }

    if (!channelId) {
      throw new Error('error-notifier: Channel ID is required');
    }

    this.initialize(slackToken, channelName, channelId);

    if (options?.autoDeleteFiles !== undefined) {
      this.autoDeleteFiles = options.autoDeleteFiles;
    }

    console.log(`✅ error-notifier: Initialized with channel: ${channelName}`);
  }

  getSlackClient(): WebClient {
    if (!this.slackClient) {
      throw new Error('Slack client not initialized');
    }
    return this.slackClient;
  }

  getDefaultChannelName(): string {
    return this.defaultChannelName;
  }

  getDefaultChannelId(): string {
    return this.defaultChannelId;
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  shouldAutoDeleteFiles(): boolean {
    return this.autoDeleteFiles;
  }

  getTempDir(): string {
    return this.tempDir;
  }
}

// ============================================
// 2. EVENT NAMES
// ============================================
const EVENTS = {
  HIGH_ALERT: 'high-alert',
  MEDIUM_ALERT: 'medium-alert',
  LOW_ALERT: 'low-alert',
  INTERNAL_ERROR: 'internal-error'
} as const;

// ============================================
// 3. FILE CREATOR WITH FORMAT CONVERSION
// ============================================
class FileCreator {
  constructor(private config: ConfigStore) { }

  /**
   * Create file from data with optional format conversion
   */
  createFileFromData(
    data: any,
    options: {
      fileName?: string;
      // Direct creation mode
      fileType?: 'txt' | 'json' | 'csv';
      // Conversion mode
      from?: 'txt' | 'json' | 'csv';
      to?: 'txt' | 'json' | 'csv';
      csvHeaders?: string[];
    } = {}
  ): string {
    // Validate options
    this.validateOptions(options);

    // Determine output format
    let outputFormat: 'txt' | 'json' | 'csv';
    let shouldConvert = false;

    if (options.from && options.to) {
      // Conversion mode
      outputFormat = options.to;
      shouldConvert = true;
    } else if (options.fileType) {
      // Direct creation mode
      outputFormat = options.fileType;
      shouldConvert = false;
    } else {
      // Default mode
      outputFormat = 'txt';
      shouldConvert = false;
    }

    // Generate filename if not provided
    let fileName = options.fileName;
    if (!fileName) {
      const timestamp = new Date().getTime();
      const random = crypto.randomBytes(4).toString('hex');
      fileName = `alert-${timestamp}-${random}.${outputFormat}`;
    } else if (!fileName.includes('.')) {
      // Add extension if missing
      fileName = `${fileName}.${outputFormat}`;
    }

    const filePath = path.join(this.config.getTempDir(), fileName);

    // Process data based on mode
    if (shouldConvert && options.from && options.to) {
      // CONVERSION MODE
      this.convertAndCreateFile(filePath, data, options.from, options.to, options.csvHeaders);
    } else {
      // DIRECT CREATION MODE
      this.createFileDirectly(filePath, data, outputFormat, options.csvHeaders);
    }

    console.log(`📄 Created ${outputFormat.toUpperCase()} file: ${fileName}`);
    return filePath;
  }

  /**
   * Validate that options are valid
   */
  private validateOptions(options: any): void {
    const hasFileType = !!options.fileType;
    const hasFrom = !!options.from;
    const hasTo = !!options.to;

    // Cannot use both modes
    if (hasFileType && (hasFrom || hasTo)) {
      throw new Error('Cannot use both fileType and from/to options together. Use either fileType for direct creation or from/to for conversion.');
    }

    // from and to must be used together
    if ((hasFrom && !hasTo) || (!hasFrom && hasTo)) {
      throw new Error('Both "from" and "to" options must be provided together for format conversion.');
    }

    // Validate format values
    const validFormats = ['txt', 'json', 'csv'];
    if (options.fileType && !validFormats.includes(options.fileType)) {
      throw new Error(`Invalid fileType: ${options.fileType}. Must be one of: ${validFormats.join(', ')}`);
    }
    if (options.from && !validFormats.includes(options.from)) {
      throw new Error(`Invalid from format: ${options.from}. Must be one of: ${validFormats.join(', ')}`);
    }
    if (options.to && !validFormats.includes(options.to)) {
      throw new Error(`Invalid to format: ${options.to}. Must be one of: ${validFormats.join(', ')}`);
    }

    // Cannot convert to same format
    if (options.from && options.to && options.from === options.to) {
      throw new Error(`Cannot convert from ${options.from} to ${options.to} (same format). Use fileType option instead.`);
    }
  }

  /**
   * Convert data and create file
   */
  private convertAndCreateFile(
    filePath: string,
    data: any,
    from: 'txt' | 'json' | 'csv',
    to: 'txt' | 'json' | 'csv',
    csvHeaders?: string[]
  ): void {
    // Convert based on source and target formats
    switch (from) {
      case 'json':
        if (to === 'csv') {
          this.createCsvFile(filePath, this.parseJsonData(data), csvHeaders);
        } else if (to === 'txt') {
          this.createTextFile(filePath, this.parseJsonData(data));
        }
        break;

      case 'csv':
        if (to === 'json') {
          this.createJsonFile(filePath, this.parseCsvData(data, csvHeaders));
        } else if (to === 'txt') {
          this.createTextFile(filePath, this.parseCsvData(data, csvHeaders));
        }
        break;

      case 'txt':
        if (to === 'json') {
          this.createJsonFile(filePath, this.parseTextData(data));
        } else if (to === 'csv') {
          this.createCsvFile(filePath, this.parseTextData(data), csvHeaders);
        }
        break;
    }
  }

  /**
   * Direct file creation (no conversion)
   */
  private createFileDirectly(
    filePath: string,
    data: any,
    fileType: 'txt' | 'json' | 'csv',
    csvHeaders?: string[]
  ): void {
    switch (fileType) {
      case 'txt':
        this.createTextFile(filePath, data);
        break;

      case 'json':
        this.createJsonFile(filePath, data);
        break;

      case 'csv':
        this.createCsvFile(filePath, data, csvHeaders);
        break;

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  /**
   * Parse JSON data (handle strings, objects, arrays)
   */
  private parseJsonData(data: any): any {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (error) {
        throw new Error('Invalid JSON string provided for conversion');
      }
    }
    return data;
  }

  /**
   * Parse CSV data to array of objects or arrays
   */
  private parseCsvData(csvString: string, headers?: string[]): any[] {
    if (typeof csvString !== 'string') {
      throw new Error('CSV data must be a string for conversion');
    }

    const lines = csvString.trim().split('\n');
    if (lines.length === 0) return [];

    let result: any[] = [];

    if (headers) {
      // Use provided headers
      for (let i = 0; i < lines.length; i++) {
        const values = this.parseCsvLine(lines[i]);
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        result.push(obj);
      }
    } else {
      // Auto-detect headers from first line
      const firstLineHeaders = this.parseCsvLine(lines[0]);
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCsvLine(lines[i]);
        const obj: any = {};
        firstLineHeaders.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        result.push(obj);
      }
    }

    return result;
  }

  /**
   * Parse a single CSV line
   */
  /**
   * Parse CSV data - FIXED to handle quoted values better
   */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
          continue;
        } else {
          // Start/end quotes
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current);
        current = '';
      } else {
        current += char;
      }

      i++;
    }

    // Add last field
    result.push(current);
    return result;
  }

  /**
 * Parse text data for conversion to CSV/JSON
 */
  private parseTextData(text: string): any {
    if (typeof text !== 'string') {
      return {
        content: String(text),
        timestamp: new Date().toISOString()
      };
    }

    // Clean the text
    const cleanedText = text.trim();

    // For CSV conversion: Return as array of objects with line content
    const lines = cleanedText.split('\n');

    // If it's a simple multi-line text, create array of objects
    if (lines.length > 1) {
      return lines.map((line, index) => ({
        lineNumber: index + 1,
        content: line.trim(),
        characterCount: line.length
      }));
    }

    // If it's a single line, return as is
    return {
      content: cleanedText,
      timestamp: new Date().toISOString(),
      length: cleanedText.length
    };
  }

  /**
   * Create text file (.txt)
   */
  private createTextFile(filePath: string, data: any): void {
    let content: string;

    if (typeof data === 'string') {
      content = data;
    } else if (data instanceof Error) {
      content = `ERROR: ${data.message}\n\nSTACK TRACE:\n${data.stack || 'No stack trace'}`;
    } else if (typeof data === 'object') {
      content = JSON.stringify(data, null, 2);
    } else {
      content = String(data);
    }

    fs.writeFileSync(filePath, content);
  }

  /**
   * Create JSON file (.json)
   */
  private createJsonFile(filePath: string, data: any): void {
    let jsonData: any;

    if (typeof data === 'string') {
      try {
        // Try to parse if it's JSON string
        jsonData = JSON.parse(data);
      } catch {
        // If not JSON, wrap in object
        jsonData = { content: data, timestamp: new Date().toISOString() };
      }
    } else if (data instanceof Error) {
      jsonData = {
        error: data.message,
        stack: data.stack,
        timestamp: new Date().toISOString(),
        type: 'Error'
      };
    } else {
      jsonData = data;
    }

    // Add metadata
    const finalData = {
      ...jsonData,
      _metadata: {
        generatedAt: new Date().toISOString(),
        source: 'error-notifier',
        format: 'json'
      }
    };

    fs.writeFileSync(filePath, JSON.stringify(finalData, null, 2));
  }

  /**
   * Create CSV file (.csv)
   */
  private createCsvFile(filePath: string, data: any, headers?: string[]): void {
    let csvContent = '';

    if (Array.isArray(data)) {
      // Array of objects or arrays
      if (data.length === 0) {
        csvContent = 'No data';
      } else if (typeof data[0] === 'object' && !Array.isArray(data[0])) {
        // Array of objects - FLATTEN nested objects
        const allHeaders = headers || this.extractHeadersFromObjects(data);
        csvContent += allHeaders.join(',') + '\n';

        data.forEach((item: any) => {
          const row = allHeaders.map(header => {
            const value = this.getNestedValue(item, header);
            // Handle commas, quotes, and newlines in CSV
            if (value === null || value === undefined) return '';

            let stringValue: string;
            if (typeof value === 'object') {
              // Convert nested objects/arrays to JSON strings
              stringValue = JSON.stringify(value);
            } else {
              stringValue = String(value);
            }

            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          });
          csvContent += row.join(',') + '\n';
        });
      } else {
        // Array of arrays or primitives
        if (headers) {
          csvContent += headers.join(',') + '\n';
        }

        data.forEach((row: any) => {
          if (Array.isArray(row)) {
            const escapedRow = row.map(cell => {
              const stringCell = String(cell);
              if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
                return `"${stringCell.replace(/"/g, '""')}"`;
              }
              return stringCell;
            });
            csvContent += escapedRow.join(',') + '\n';
          } else {
            csvContent += String(row) + '\n';
          }
        });
      }
    } else if (typeof data === 'object') {
      // Single object - FLATTEN it
      const allHeaders = headers || Object.keys(data);
      csvContent += allHeaders.join(',') + '\n';

      const row = allHeaders.map(header => {
        const value = this.getNestedValue(data, header);
        if (value === null || value === undefined) return '';

        let stringValue: string;
        if (typeof value === 'object') {
          // Convert nested objects/arrays to JSON strings
          stringValue = JSON.stringify(value);
        } else {
          stringValue = String(value);
        }

        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvContent += row.join(',') + '\n';
    } else {
      // Single value
      const stringValue = String(data);
      if (headers) {
        csvContent += headers.join(',') + '\n';
        csvContent += stringValue + '\n';
      } else {
        csvContent = 'Value\n' + stringValue + '\n';
      }
    }

    fs.writeFileSync(filePath, csvContent);
  }

  /**
  * Extract all headers from array of objects (including nested paths)
  */
  private extractHeadersFromObjects(objects: any[]): string[] {
    const headers = new Set<string>();

    objects.forEach(obj => {
      this.flattenObject(obj).forEach(key => {
        headers.add(key);
      });
    });

    return Array.from(headers);
  }

  /**
   * Flatten nested object to dot notation
   */
  private flattenObject(obj: any, prefix: string = ''): string[] {
    const keys: string[] = [];

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          // Recursively flatten nested object
          keys.push(...this.flattenObject(obj[key], fullKey));
        } else {
          keys.push(fullKey);
        }
      }
    }

    return keys;
  }

  /**
   * Get value from nested object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Delete file after sending
   */
  async deleteFile(filePath: string): Promise<void> {
    if (!this.config.shouldAutoDeleteFiles()) {
      console.log(`📁 File deletion disabled: ${filePath}`);
      return;
    }

    try {
      await fs.promises.unlink(filePath);
      console.log(`🗑️  Deleted file: ${path.basename(filePath)}`);
    } catch (error) {
      console.error(`❌ Failed to delete file ${filePath}:`, error);
    }
  }

  /**
   * Clean up old temp files
   */
  async cleanupOldFiles(maxAgeHours: number = 24): Promise<void> {
    const tempDir = this.config.getTempDir();
    if (!fs.existsSync(tempDir)) return;

    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.promises.unlink(filePath);
          console.log(`🧹 Cleaned up old file: ${file}`);
        }
      } catch (error) {
        // Ignore errors for cleanup
      }
    }
  }
}

// ============================================
// 4. SLACK NOTIFIER (Updated for format conversion)
// ============================================
class SlackNotifier {
  private fileCreator: FileCreator;

  constructor(private config: ConfigStore) {
    this.fileCreator = new FileCreator(config);

    // Cleanup old files on startup
    this.fileCreator.cleanupOldFiles().catch(() => { });
  }

  async sendToSlack(
    severity: 'HIGH' | 'MEDIUM' | 'LOW',
    error: Error | string,
    options?: {
      channelName?: string;
      channelId?: string;
      // Direct creation mode
      fileData?: any;
      fileName?: string;
      fileType?: 'txt' | 'json' | 'csv';
      // Conversion mode
      from?: 'txt' | 'json' | 'csv';
      to?: 'txt' | 'json' | 'csv';
      csvHeaders?: string[];
      comment?: string;
    }
  ): Promise<void> {
    try {
      const channelName = options?.channelName || this.config.getDefaultChannelName();
      const channelId = options?.channelId || this.config.getDefaultChannelId();
      const client = this.config.getSlackClient();

      // Format error message
      const errorMessage = error instanceof Error ? error.message : error;
      const stackTrace = error instanceof Error ? error.stack || '' : '';

      // Create message blocks
      let color = '#36a64f'; // Green for LOW
      let emoji = 'ℹ️';

      if (severity === 'MEDIUM') {
        color = '#ffcc00'; // Yellow
        emoji = '⚠️';
      } else if (severity === 'HIGH') {
        color = '#ff0000'; // Red
        emoji = '🚨';
      }

      const blocks: any[] = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} ${severity} ALERT`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Error:*\n\`\`\`${errorMessage.substring(0, 1000)}\`\`\``
          }
        }
      ];

      // Add file info if fileData is provided
      let filePath: string | undefined;

      if (options?.fileData !== undefined) {
        // Create file from data with optional conversion
        filePath = this.fileCreator.createFileFromData(options.fileData, {
          fileName: options.fileName,
          fileType: options.fileType,
          from: options.from,
          to: options.to,
          csvHeaders: options.csvHeaders
        });

        const fileName = path.basename(filePath);
        const stats = fs.statSync(filePath);
        const fileSizeKB = (stats.size / 1024).toFixed(2);
        const fileExtension = path.extname(fileName).substring(1).toUpperCase();

        // Add conversion info if applicable
        let formatInfo = `*Format:* ${fileExtension}`;
        if (options.from && options.to) {
          formatInfo = `*Converted:* ${options.from.toUpperCase()} → ${options.to.toUpperCase()}`;
        }

        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Attached File:* ${fileName}\n${formatInfo}\n*Size:* ${fileSizeKB} KB`
          }
        });

        if (options.comment) {
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Comment:* ${options.comment}`
            }
          });
        }
      } else if (options?.comment) {
        // If no file but has comment
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Note:* ${options.comment}`
          }
        });
      }

      // Add timestamp
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Time:* ${new Date().toLocaleString()}`
          }
        ]
      });

      // 1️⃣ FIRST: Send message with CHANNEL NAME
      console.log(`📤 Sending ${severity} alert to ${channelName}...`);

      const messageResult = await client.chat.postMessage({
        channel: channelName,
        text: `${emoji} ${severity} Alert: ${errorMessage.substring(0, 100)}...`,
        blocks: blocks,
        attachments: [
          {
            color: color
          }
        ]
      });

      console.log(`✅ Message sent successfully (ID: ${messageResult.ts})`);

      // 2️⃣ SECOND: Upload file if fileData was provided
      if (filePath) {
        try {
          const fileBuffer = fs.readFileSync(filePath);
          const fileName = path.basename(filePath);

          console.log(`📎 Uploading file: ${fileName}...`);

          // Use uploadV2 with CHANNEL ID
          const uploadResult = await client.files.uploadV2({
            channel_id: channelId,
            file: fileBuffer,
            filename: fileName,
            title: `${severity} Alert - ${fileName}`
          });

          console.log(`✅ File uploaded successfully`);

          // Delete file after successful upload
          if (uploadResult.ok) {
            await this.fileCreator.deleteFile(filePath);
          }

        } catch (fileError: any) {
          console.error(`❌ File upload failed:`, fileError.message);

          // Don't crash - message was already sent successfully
          // File will be cleaned up by scheduled cleanup
        }
      }

    } catch (slackError: any) {
      emitter.emit(EVENTS.INTERNAL_ERROR,
        new Error(`Slack API failed: ${slackError?.data?.error || slackError.message || 'Unknown error'}`));
    }
  }
}

// ============================================
// 5. CORE SETUP
// ============================================
const emitter = new EventEmitter();
const config = ConfigStore.getInstance();
let listenersInitialized = false;

// Define options interface
interface AlertOptions {
  channelName?: string;
  channelId?: string;
  fileData?: any;
  fileName?: string;
  fileType?: 'txt' | 'json' | 'csv';
  from?: 'txt' | 'json' | 'csv';
  to?: 'txt' | 'json' | 'csv';
  csvHeaders?: string[];
  comment?: string;
}

function initializeListeners(): void {
  if (listenersInitialized) return;

  const slackNotifier = new SlackNotifier(config);

  // HIGH alerts
  emitter.on(EVENTS.HIGH_ALERT, (
    error: Error | string,
    options?: AlertOptions
  ) => {
    if (!config.getIsInitialized()) {
      console.error('❌ error-notifier: Cannot send alert - not initialized');
      return;
    }
    slackNotifier.sendToSlack('HIGH', error, options);
  });

  // MEDIUM alerts
  emitter.on(EVENTS.MEDIUM_ALERT, (
    error: Error | string,
    options?: AlertOptions
  ) => {
    if (!config.getIsInitialized()) {
      console.error('❌ error-notifier: Cannot send alert - not initialized');
      return;
    }
    slackNotifier.sendToSlack('MEDIUM', error, options);
  });

  // LOW alerts
  emitter.on(EVENTS.LOW_ALERT, (
    error: Error | string,
    options?: AlertOptions
  ) => {
    if (!config.getIsInitialized()) {
      console.error('❌ error-notifier: Cannot send alert - not initialized');
      return;
    }
    slackNotifier.sendToSlack('LOW', error, options);
  });

  listenersInitialized = true;
  console.log('🔌 Listeners initialized');
}

initializeListeners();

// ============================================
// 6. PUBLIC API (Updated with format conversion)
// ============================================
const alert = {
  /**
   * Initialize the error notifier
   */
  init(
    slackToken: string,
    channelName: string,
    channelId: string,
    options?: { autoDeleteFiles?: boolean }
  ): void {
    config.init(slackToken, channelName, channelId, options);
  },

  /**
   * Send high priority alert with optional file data or conversion
   */
  high(
    error: Error | string,
    options?: AlertOptions
  ): void {
    if (!config.getIsInitialized()) {
      console.error('❌ error-notifier: Not initialized');
      return;
    }
    emitter.emit(EVENTS.HIGH_ALERT, error, options);
  },

  /**
   * Send medium priority alert with optional file data or conversion
   */
  medium(
    error: Error | string,
    options?: AlertOptions
  ): void {
    if (!config.getIsInitialized()) {
      console.error('❌ error-notifier: Not initialized');
      return;
    }
    emitter.emit(EVENTS.MEDIUM_ALERT, error, options);
  },

  /**
   * Send low priority alert with optional file data or conversion
   */
  low(
    error: Error | string,
    options?: AlertOptions
  ): void {
    if (!config.getIsInitialized()) {
      console.error('❌ error-notifier: Not initialized');
      return;
    }
    emitter.emit(EVENTS.LOW_ALERT, error, options);
  },

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return config.getIsInitialized();
  },

  /**
   * Get current channel info
   */
  getChannelInfo(): { name: string; id: string } {
    return {
      name: config.getDefaultChannelName(),
      id: config.getDefaultChannelId()
    };
  },

  /**
   * Clean up temp files manually
   */
  async cleanupTempFiles(): Promise<void> {
    const tempDir = config.getTempDir();
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      console.log(`🧹 Cleaning up ${files.length} temp files...`);
      // Implementation would go here
    }
  },

  /**
   * Listen to internal library errors
   */
  onError(listener: (error: Error) => void): void {
    emitter.on(EVENTS.INTERNAL_ERROR, listener);
  },

  /**
   * Remove error listener
   */
  offError(listener: (error: Error) => void): void {
    emitter.off(EVENTS.INTERNAL_ERROR, listener);
  }
};

export default alert;
export type AlertSeverity = 'high' | 'medium' | 'low';
export type FileType = 'txt' | 'json' | 'csv';