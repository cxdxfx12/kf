const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const pdfPath = path.join(__dirname, '分公司质控管理手册.pdf');
const outputPath = path.join(__dirname, '分公司质控管理手册.txt');

(async () => {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfParser = new PDFParse({ data: dataBuffer, verbosity: 0 });
    const result = await pdfParser.getText();
    console.log('Total pages:', result.total);
    console.log('Text length:', result.text.length);
    fs.writeFileSync(outputPath, result.text, 'utf-8');
    console.log('Saved to:', outputPath);
    await pdfParser.destroy();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
