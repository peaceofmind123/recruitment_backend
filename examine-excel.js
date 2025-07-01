const XLSX = require('xlsx');

try {
    const workbook = XLSX.readFile('District.xlsx');
    console.log('Sheet names:', workbook.SheetNames);

    workbook.SheetNames.forEach((sheetName, index) => {
        console.log(`\n=== Sheet ${index + 1}: ${sheetName} ===`);
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log('First 10 rows:');
        console.log(data.slice(0, 10));
        console.log(`Total rows: ${data.length}`);
    });
} catch (error) {
    console.error('Error reading Excel file:', error.message);
} 