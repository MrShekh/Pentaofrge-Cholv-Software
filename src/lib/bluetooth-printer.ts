// Web Bluetooth ESC/POS Direct Thermal Printer Utility
// Communicates directly with Bluetooth POS printers (POSIFLOW, Xprinter, Epson, etc.) via Chrome on Android

// Standard Bluetooth GATT Printer Services & Characteristics
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Print Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Posiflow / Chinese thermal printers
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent UART (very common in POS-58/80)
  '0000ff00-0000-1000-8000-00805f9b34fb', // Custom FF00
  '0000fee7-0000-1000-8000-00805f9b34fb', // Custom FEE7
];

// In-memory cached printer device for quick re-prints
let cachedDevice: any = null;
let cachedCharacteristic: any = null;

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Connect to thermal Bluetooth printer
 */
export async function connectThermalPrinter(): Promise<any> {
  if (!isWebBluetoothSupported()) {
    throw new Error('Web Bluetooth is not supported on this browser. Please use Google Chrome on Android.');
  }

  // Reuse existing connection if open
  if (cachedDevice && cachedDevice.gatt && cachedDevice.gatt.connected && cachedCharacteristic) {
    return cachedCharacteristic;
  }

  const nav: any = navigator;
  
  // Request Bluetooth Device
  const device = await nav.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICES,
  });

  if (!device || !device.gatt) {
    throw new Error('No Bluetooth device selected.');
  }

  device.addEventListener('gattserverdisconnected', () => {
    cachedDevice = null;
    cachedCharacteristic = null;
  });

  const server = await device.gatt.connect();

  // Find the writable characteristic across supported services
  let writeChar: any = null;

  for (const serviceUuid of PRINTER_SERVICES) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeChar = char;
          break;
        }
      }
      if (writeChar) break;
    } catch {
      // Continue searching next service
    }
  }

  // If none matched predefined UUIDs, scan all primary services
  if (!writeChar) {
    try {
      const services = await server.getPrimaryServices();
      for (const service of services) {
        try {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              writeChar = char;
              break;
            }
          }
          if (writeChar) break;
        } catch {}
      }
    } catch {}
  }

  if (!writeChar) {
    throw new Error('Could not find a writable print channel on the selected printer. Please make sure the printer is turned on and paired.');
  }

  cachedDevice = device;
  cachedCharacteristic = writeChar;
  return writeChar;
}

/**
 * Send chunked ESC/POS bytes to avoid Bluetooth buffer overflows
 */
export async function sendEscPosCommands(characteristic: any, data: Uint8Array): Promise<void> {
  const CHUNK_SIZE = 100; // Safe chunk size for BLE MTU
  for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
    const chunk = data.slice(offset, offset + CHUNK_SIZE);
    if (characteristic.writeValueWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
    // Small pause between chunks
    await new Promise((r) => setTimeout(r, 20));
  }
}

/**
 * Helper to build ESC/POS byte buffers
 */
export class EscPosBuilder {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  // ESC @ - Initialize printer
  init(): this {
    this.buffer.push(0x1b, 0x40);
    return this;
  }

  // Alignment: 0 = Left, 1 = Center, 2 = Right
  align(align: 'left' | 'center' | 'right'): this {
    const code = align === 'center' ? 1 : align === 'right' ? 2 : 0;
    this.buffer.push(0x1b, 0x61, code);
    return this;
  }

  // Bold text
  bold(on: boolean): this {
    this.buffer.push(0x1b, 0x45, on ? 1 : 0);
    return this;
  }

  // Double height & width
  doubleSize(on: boolean): this {
    this.buffer.push(0x1d, 0x21, on ? 0x11 : 0x00);
    return this;
  }

  // Text
  text(str: string): this {
    // Encode to ASCII/Latin-1
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      this.buffer.push(code < 128 ? code : 0x20); // replace non-ascii with space/placeholder
    }
    return this;
  }

  // Text with newline
  textLine(str: string): this {
    this.text(str);
    this.buffer.push(0x0a);
    return this;
  }

  // Newline
  newLine(count = 1): this {
    for (let i = 0; i < count; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  // Dashed or solid line across 80mm roll (48 characters width)
  line(char = '-', length = 48): this {
    this.align('left');
    this.textLine(char.repeat(length));
    return this;
  }

  // Two column row (Left label, Right value) for 80mm (48 chars width)
  twoColumn(left: string, right: string, totalWidth = 48): this {
    const leftTrim = left.slice(0, totalWidth - right.length - 1);
    const spaces = Math.max(1, totalWidth - leftTrim.length - right.length);
    this.align('left');
    this.textLine(leftTrim + ' '.repeat(spaces) + right);
    return this;
  }

  // Feed and Auto-Cut (GS V 66 0)
  feedAndCut(feedLines = 4): this {
    this.newLine(feedLines);
    this.buffer.push(0x1d, 0x56, 66, 0); // GS V 66 0 = Partial Cut
    return this;
  }

  getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Format and print OUT Entry Receipt
 */
export async function printOutReceiptDirect(data: {
  transactionNumber: string;
  customerName: string;
  machineType?: 'HAND' | 'BIG';
  weight: string;
  date: string | Date;
  notes?: string | null;
  previousBalance?: string;
  newBalance?: string;
}): Promise<void> {
  const characteristic = await connectThermalPrinter();
  const builder = new EscPosBuilder();

  const formattedDate = new Date(data.date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Header
  builder
    .align('center')
    .bold(true)
    .doubleSize(true)
    .textLine('A.M CHOOL')
    .doubleSize(false)
    .textLine('Cutting & Delivery Slip')
    .line('-')
    .align('left');

  // Meta
  builder
    .twoColumn('Slip No:', data.transactionNumber)
    .twoColumn('Date & Time:', formattedDate)
    .twoColumn('Machine:', data.machineType === 'BIG' ? 'Big Machine (Boro)' : 'Hand Machine')
    .line('-');

  // Customer
  builder
    .bold(true)
    .textLine('CUSTOMER:')
    .doubleSize(false)
    .textLine(`  ${data.customerName}`)
    .bold(false)
    .line('-');

  // Delivered Weight Highlight
  builder
    .align('center')
    .bold(true)
    .textLine('DELIVERED / OUT WEIGHT')
    .doubleSize(true)
    .textLine(` ${data.weight} g `)
    .doubleSize(false)
    .bold(false)
    .line('-');

  // Order Remarks
  if (data.notes) {
    builder
      .align('left')
      .textLine(`Order/Remark: ${data.notes}`)
      .line('-');
  }

  // Balance status
  if (data.previousBalance !== undefined || data.newBalance !== undefined) {
    if (data.previousBalance !== undefined) {
      builder.twoColumn('Previous Balance:', `${data.previousBalance} g`);
    }
    if (data.newBalance !== undefined) {
      builder
        .bold(true)
        .twoColumn('Current Remaining:', `${data.newBalance} g`)
        .bold(false);
    }
    builder.line('-');
  }

  // Footer & Cut
  builder
    .align('center')
    .textLine('Thank you! - A.M Chool')
    .feedAndCut(4);

  await sendEscPosCommands(characteristic, builder.getBytes());
}

/**
 * Format and print Full Settlement Receipt
 */
export async function printSettlementReceiptDirect(settlement: {
  settlementNumber: string;
  customerName: string;
  karatName: string;
  settlementDate: string | Date;
  machineType?: 'HAND' | 'BIG';
  totalInWeight: string;
  totalOutWeight: string;
  chargeableWeight?: string;
  finalMakingAmount?: string;
  galaiLoss?: string;
  returnedGoldWeight?: string;
  outTransactions?: Array<{ weight: string; transactionDate: string | Date; notes?: string | null }>;
}): Promise<void> {
  const characteristic = await connectThermalPrinter();
  const builder = new EscPosBuilder();

  const formattedDate = new Date(settlement.settlementDate).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Header
  builder
    .align('center')
    .bold(true)
    .doubleSize(true)
    .textLine('A.M CHOOL')
    .doubleSize(false)
    .textLine('Settlement Receipt')
    .line('-')
    .align('left');

  // Meta
  builder
    .twoColumn('Settlement No:', settlement.settlementNumber)
    .twoColumn('Date:', formattedDate)
    .twoColumn('Machine:', settlement.machineType === 'BIG' ? 'Big Machine (Boro)' : 'Hand Machine')
    .twoColumn('Karat Grade:', settlement.karatName)
    .line('-');

  // Customer
  builder
    .bold(true)
    .textLine(`Customer: ${settlement.customerName}`)
    .bold(false)
    .line('-');

  // Received / In Weight
  builder
    .bold(true)
    .twoColumn('RECEIVED (IN):', `${settlement.totalInWeight} g`)
    .twoColumn('TOTAL IN:', `${settlement.totalInWeight} g`)
    .bold(false)
    .line('-');

  // Out entries
  if (settlement.outTransactions && settlement.outTransactions.length > 0) {
    builder.bold(true).textLine('DELIVERIES (OUT):').bold(false);
    settlement.outTransactions.forEach((t, i) => {
      const outLabel = settlement.outTransactions!.length > 1 ? `  Out #${i + 1}:` : '  Out:';
      builder.twoColumn(outLabel, `${t.weight} g`);
      if (t.notes) {
        builder.textLine(`    Order: ${t.notes}`);
      }
    });
    builder.line('-');
  } else if (parseFloat(settlement.totalOutWeight || '0') > 0) {
    builder.twoColumn('Total Out:', `${settlement.totalOutWeight} g`).line('-');
  }

  // Making charge
  const makingAmt = parseFloat(settlement.finalMakingAmount || '0');
  const makingGold = parseFloat(settlement.chargeableWeight || '0');
  if (makingAmt > 0 && makingGold === 0) {
    builder.twoColumn('Making Charge:', `Rs.${settlement.finalMakingAmount}`);
  } else if (makingGold > 0) {
    builder.twoColumn('Making Charge (Gold):', `${settlement.chargeableWeight} g`);
  }

  // Galai loss if any
  if (parseFloat(settlement.galaiLoss || '0') > 0) {
    builder.twoColumn('Galai Loss:', `${settlement.galaiLoss} g`);
  }
  builder.line('-');

  // Return to customer
  const returnStr = settlement.returnedGoldWeight || '0.000';
  builder
    .align('center')
    .bold(true)
    .textLine('RETURN TO CUSTOMER')
    .doubleSize(true)
    .textLine(` ${returnStr} g `)
    .doubleSize(false)
    .bold(false)
    .line('-');

  // Footer & Cut
  builder
    .align('center')
    .textLine('Thank you! - A.M Chool')
    .feedAndCut(4);

  await sendEscPosCommands(characteristic, builder.getBytes());
}

