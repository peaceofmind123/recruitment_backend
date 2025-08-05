# Date Converter Script

This Node.js script converts English dates to Nepali dates using the hamropatro.com API.

## Features

- Converts English dates (YYYY-MM-DD format) to Nepali dates
- Processes dates from 1980-01-01 to 2033-12-31
- Saves results to a CSV file
- Includes error handling and progress tracking
- Respectful API usage with delays between requests

## Installation

1. Navigate to the date-converter directory:
   ```bash
   cd date-converter
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Test the script first:
```bash
npm test
```

### Run the full conversion:
```bash
npm start
```

This will:
- Convert all dates from 1980-01-01 to 2033-12-31
- Save results to `date_conversions.csv`
- Show progress updates
- Display final statistics

## Output

The script generates a CSV file (`date_conversions.csv`) with the following columns:
- English Date: The original English date (YYYY-MM-DD)
- Nepali Date: The converted Nepali date
- Success: Boolean indicating if the conversion was successful

## API Details

The script uses the hamropatro.com API:
- Endpoint: `https://www.hamropatro.com/getMethod.php`
- Method: POST
- Form data parameters:
  - `actionName`: 'dconverter'
  - `datefield`: The date to convert (YYYY-MM-DD)
  - `convert_option`: 'eng_to_nep'

## Response Format

The API returns HTML with the Nepali date in `<span>` tags:
```html
<strong>Result: </strong>बुधवार January , 2025 | <span>२०८१ पुष १७, बुधवार</span>
```

## Performance

- Processes dates in batches of 10
- 2-second delay between batches to be respectful to the API
- Total processing time: Approximately 2-3 hours for all dates (1980-2033)
- Progress updates every 10 dates

## Error Handling

- Network timeouts (10 seconds per request)
- Invalid date formats
- API errors
- Failed requests are logged and marked as errors in the CSV

## Files

- `date_converter.js`: Main conversion script
- `test_converter.js`: Test script for verification
- `package.json`: Dependencies and scripts
- `README-DATECONVERTER.md`: This documentation 