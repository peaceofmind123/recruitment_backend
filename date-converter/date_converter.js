const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Function to parse the HTML response and extract Nepali date
function parseNepaliDate(htmlResponse) {
    try {
        // Extract the content between <span> tags
        const spanMatch = htmlResponse.match(/<span>(.*?)<\/span>/);
        if (spanMatch) {
            return spanMatch[1].trim();
        }
        
        // Fallback: extract content after "Result: " and before " | "
        const resultMatch = htmlResponse.match(/<strong>Result: <\/strong>(.*?) \|/);
        if (resultMatch) {
            return resultMatch[1].trim();
        }
        
        return 'Unknown';
    } catch (error) {
        console.error('Error parsing response:', error);
        return 'Error';
    }
}

// Function to convert a single date
async function convertDate(englishDate) {
    try {
        const formData = new FormData();
        formData.append('actionName', 'dconverter');
        formData.append('datefield', englishDate);
        formData.append('convert_option', 'eng_to_nep');

        const response = await axios.post('https://www.hamropatro.com/getMethod.php', formData, {
            headers: {
                ...formData.getHeaders(),
            },
            timeout: 10000 // 10 second timeout
        });

        const nepaliDate = parseNepaliDate(response.data);
        return {
            englishDate,
            nepaliDate,
            success: true
        };
    } catch (error) {
        console.error(`Error converting date ${englishDate}:`, error.message);
        return {
            englishDate,
            nepaliDate: 'Error',
            success: false
        };
    }
}

// Function to generate date range
function generateDateRange(startDate, endDate) {
    const dates = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
}

// Function to add delay between requests to be respectful to the API
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function
async function main() {
    console.log('Starting date conversion process...');
    
    // Generate date range from 1980-01-01 to 2033-12-31
    const startDate = '1980-01-01';
    const endDate = '2033-12-31';
    const dates = generateDateRange(startDate, endDate);
    
    console.log(`Total dates to process: ${dates.length}`);
    
    // Create CSV file with headers
    const csvHeader = 'English Date,Nepali Date,Success\n';
    fs.writeFileSync('date_conversions.csv', csvHeader);
    
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // Process dates in batches to avoid overwhelming the API
    const batchSize = 10;
    
    for (let i = 0; i < dates.length; i += batchSize) {
        const batch = dates.slice(i, i + batchSize);
        
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(dates.length / batchSize)} (${i + 1}-${Math.min(i + batchSize, dates.length)})`);
        
        // Process batch with concurrent requests
        const promises = batch.map(async (date) => {
            const result = await convertDate(date);
            return result;
        });
        
        const results = await Promise.all(promises);
        
        // Write results to CSV
        for (const result of results) {
            const csvLine = `"${result.englishDate}","${result.nepaliDate}",${result.success}\n`;
            fs.appendFileSync('date_conversions.csv', csvLine);
            
            processedCount++;
            if (result.success) {
                successCount++;
            } else {
                errorCount++;
            }
        }
        
        // Add delay between batches to be respectful to the API
        if (i + batchSize < dates.length) {
            console.log('Waiting 2 seconds before next batch...');
            await delay(2000);
        }
        
        // Progress update
        const progress = ((i + batchSize) / dates.length * 100).toFixed(2);
        console.log(`Progress: ${progress}% (${processedCount}/${dates.length})`);
    }
    
    console.log('\n=== Conversion Complete ===');
    console.log(`Total processed: ${processedCount}`);
    console.log(`Successful conversions: ${successCount}`);
    console.log(`Failed conversions: ${errorCount}`);
    console.log('Results saved to: date_conversions.csv');
}

// Handle errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { convertDate, parseNepaliDate }; 