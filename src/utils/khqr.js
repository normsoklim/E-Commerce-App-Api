import QRCode from 'qrcode';

// KHQR (Cambodian Quick Response) code generator
// Based on National Bank of Cambodia's KHQR standard

class KHQRGenerator {
  constructor() {
    // KHQR payload structure
    this.payloadTemplate = {
      // Payload Format Indicator (Mandatory)
      '00': '01', // Version of QR Code specification
      
      // Point of Initiation Method (Mandatory)
      '01': '12', // 11 = Static QR, 12 = Dynamic QR
      
      // Merchant Account Information (Mandatory - up to 3 occurrences)
      // Sub-fields: 0 = AID, 1 = PAN, 2 = Cardholder name, 3 = Transaction currency, 4 = Transaction amount
    };
  }

  // Generate KHQR code for ABA Bank
  generateABAKHQR(orderId, amount, currency = '896', merchantName = 'Your Store', city = 'Phnom Penh') {
    console.log("Generating ABA KHQR for order:", orderId, "amount:", amount);
    // ABA Bank specific format
    const payload = this.buildPayload({
      orderId,
      amount,
      currency,
      merchantName,
      city,
      bankCode: 'ABA'
    });
    console.log("ABA KHQR payload:", payload);
    
    return payload;
  }

  // Generate KHQR code for ACLEDA Bank
  generateACLEDAKHQR(orderId, amount, currency = '896', merchantName = 'Your Store', city = 'Phnom Penh') {
    const payload = this.buildPayload({
      orderId,
      amount,
      currency,
      merchantName,
      city,
      bankCode: 'ACLEDA'
    });
    
    return payload;
  }

  // Generate KHQR code for Wing Bank
  generateWingKHQR(orderId, amount, currency = '896', merchantName = 'Your Store', city = 'Phnom Penh') {
    const payload = this.buildPayload({
      orderId,
      amount,
      currency,
      merchantName,
      city,
      bankCode: 'WING'
    });
    
    return payload;
  }

  // Build generic KHQR payload
  buildPayload({ orderId, amount, currency, merchantName, city, bankCode }) {
    console.log("Building KHQR payload for order:", orderId, "amount:", amount, "currency:", currency);
    // Create a copy of the template
    const payload = { ...this.payloadTemplate };
    console.log("Initial payload template:", payload);
    
    // Add merchant information
    const merchantInfo = this.buildMerchantAccountInfo({
      gateway: bankCode,
      merchantId: process.env.KHQR_MERCHANT_ID || 'MERCHANT123',
      terminalId: process.env.KHQR_TERMINAL_ID || 'TERMINAL123'
    });
    console.log("Merchant info:", merchantInfo);
    payload['29'] = merchantInfo;
    
    // Add transaction amount if specified (for dynamic QR)
    if (amount) {
      payload['54'] = this.formatAmount(amount);
    }
    
    // Add transaction currency (896 = KHR, 840 = USD)
    payload['53'] = currency;
    
    // Add merchant name
    payload['59'] = this.formatText(merchantName, 25);
    
    // Add merchant city
    payload['60'] = this.formatText(city, 15);
    
    // Add postal code (optional)
    payload['61'] = process.env.KHQR_POSTAL_CODE || '12000'; // Default Phnom Penh postal code
    
    // Add CRC (Cyclic Redundancy Check - simplified)
    payload['63'] = '0000'; // This should be calculated properly in production
    
    console.log("Final payload before string conversion:", payload);
    
    // Build the complete payload string
    const result = this.buildPayloadString(payload);
    console.log("Final payload string:", result);
    return result;
  }

  // Build merchant account information field
  buildMerchantAccountInfo({ gateway, merchantId, terminalId }) {
    // Format: A008000000010106 + gateway code + 0210 + merchant ID + 0308 + terminal ID
    const gatewayCode = this.getGatewayCode(gateway);
    return `A008000000010106${gatewayCode}0210${merchantId}0308${terminalId}`;
  }

  // Get gateway code for different banks
  getGatewayCode(bankCode) {
    const codes = {
      'ABA': '001',
      'ACLEDA': '002',
      'WING': '003',
      'MAYBANK': '004',
      'ANZ': '005',
      'BCEL': '006',
      'CANADIA': '007',
      'CDB': '008',
      'EXIM': '009',
      'FTB': '010',
      'HONGLEONG': '011',
      'ICBCKH': '012',
      'JDB': '013',
      'KASIKORN': '014',
      'KHMB': '015',
      'KMB': '016',
      'KIENLONG': '017',
      'LBP': '018',
      'MAYBANK2U': '019',
      'MKB': '020',
      'NATIONAL': '021',
      'PACLEDA': '022',
      'PPI': '023',
      'PRASAC': '024',
      'SATHAPANA': '025',
      'SEAP': '026',
      'SHB': '027',
      'SIC': '028',
      'SIV': '029',
      'STB': '030',
      'TPBANK': '031',
      'TTB': '032',
      'VATTANAC': '033',
      'WOORI': '034'
    };
    
    return codes[bankCode] || '001'; // Default to ABA code
  }

  // Format amount with 2 decimal places
  formatAmount(amount) {
    return parseFloat(amount).toFixed(2);
  }

  // Format text with length indicator
  formatText(text, maxLength = 25) {
    const truncated = text.substring(0, maxLength);
    const length = truncated.length.toString().padStart(2, '0');
    return `${length}${truncated}`;
  }

  // Build the complete payload string
  buildPayloadString(payload) {
    const sortedKeys = Object.keys(payload).sort((a, b) => parseInt(a) - parseInt(b));
    let result = '';
    
    for (const key of sortedKeys) {
      const value = payload[key];
      const length = value.length.toString().padStart(2, '0');
      result += `${key}${length}${value}`;
    }
    
    // Calculate CRC (simplified - in production, use proper CRC16 algorithm)
    const crc = this.calculateCRC(result + '6304');
    result += `6304${crc}`;
    
    return result;
  }

  // Simplified CRC calculation (in production, use proper CRC16 algorithm)
  calculateCRC(payload) {
    // This is a simplified version - in production, implement proper CRC16/CCITT algorithm
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i);
      for (let j = 0; j < 8; j++) {
        if (crc & 1) {
          crc >>= 1;
          crc ^= 0xA001; // CRC16 polynomial
        } else {
          crc >>= 1;
        }
      }
    }
    
    // Convert to hex and pad to 4 characters
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  // Generate QR code image from KHQR payload
  async generateQRCode(khqrPayload, options = {}) {
    try {
      console.log("Generating QR code for payload:", khqrPayload);
      const qrCodeUrl = await QRCode.toDataURL(khqrPayload, {
        width: options.width || 300,
        margin: options.margin || 2,
        color: {
          dark: options.darkColor || '#000000',
          light: options.lightColor || '#ffffff'
        }
      });
      console.log("QR code generated successfully");
      
      return qrCodeUrl;
    } catch (error) {
      console.error("Failed to generate QR code:", error);
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  // Generate complete KHQR payment data
  async generateKHQRPayment(order) {
    console.log("Generating KHQR payment for order:", order._id, "Total:", order.total);
    
    // Validate order
    if (!order || !order._id) {
      console.error("Invalid order object provided to KHQR generation");
      throw new Error("Invalid order object");
    }
    
    // Validate required environment variables
    if (!process.env.KHQR_MERCHANT_ID) {
      console.error("KHQR_MERCHANT_ID is not set in environment variables");
      throw new Error("KHQR_MERCHANT_ID is not configured");
    }
    
    if (!process.env.KHQR_TERMINAL_ID) {
      console.error("KHQR_TERMINAL_ID is not set in environment variables");
      throw new Error("KHQR_TERMINAL_ID is not configured");
    }
    
    const amount = order.total;
    const currency = order.currency || '896'; // 896 = KHR, 840 = USD
    const merchantName = process.env.STORE_NAME || 'Your Store';
    const city = process.env.STORE_CITY || 'Phnom Penh';
    
    // Determine which bank to use (could be based on configuration or user selection)
    const bankCode = process.env.DEFAULT_KHQR_BANK || 'ABA';
    console.log("Using bank code:", bankCode);
    
    let khqrPayload;
    switch (bankCode) {
      case 'ACLEDA':
        khqrPayload = this.generateACLEDAKHQR(order._id, amount, currency, merchantName, city);
        break;
      case 'WING':
        khqrPayload = this.generateWingKHQR(order._id, amount, currency, merchantName, city);
        break;
      default:
        khqrPayload = this.generateABAKHQR(order._id, amount, currency, merchantName, city);
    }
    console.log("KHQR payload generated:", khqrPayload);
    
    // Generate QR code image
    const qrCodeUrl = await this.generateQRCode(khqrPayload, {
      width: 300,
      margin: 2
    });
    console.log("QR code generated:", qrCodeUrl);
    
    const result = {
      khqrPayload,
      qrCodeUrl,
      merchantInfo: {
        name: merchantName,
        city: city,
        bank: bankCode
      },
      amount: amount,
      currency: currency === '896' ? 'KHR' : 'USD',
      reference: `KHQR_${order._id}`,
      paymentUrl: `khqr://pay?data=${encodeURIComponent(khqrPayload)}`
    };
    console.log("KHQR payment data result:", result);
    
    return result;
  }
}

export default new KHQRGenerator();