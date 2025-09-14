import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

const NepaliDate = require('nepali-datetime');

@ApiTags('Utils')
@Controller('utils')
export class UtilsController {
    @Get('todays-bs-date')
    @ApiOperation({ summary: "Get today's date in BS (Nepali) calendar" })
    @ApiResponse({ status: 200, description: 'Returns today\'s BS date as YYYY-MM-DD', type: String })
    getTodaysBsDate(): { date: string } {
        const today = new NepaliDate();
        const bs = today.format('YYYY-MM-DD');
        return { date: bs };
    }
}


