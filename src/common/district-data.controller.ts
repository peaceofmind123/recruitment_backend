import { Controller, Post, UseInterceptors, UploadedFile, Get, HttpCode } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiTags, ApiResponse } from '@nestjs/swagger';
import { DistrictDataService } from './district-data.service';
import { UploadDistrictDataDto } from './dto/upload-district-data.dto';
import { DistrictDataResponseDto } from './dto/district-data-response.dto';

@ApiTags('district-data')
@Controller('district-data')
export class DistrictDataController {
    constructor(private readonly districtDataService: DistrictDataService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: UploadDistrictDataDto })
    @ApiResponse({ status: 200, type: DistrictDataResponseDto })
    async uploadDistrictData(@UploadedFile() file: Express.Multer.File): Promise<DistrictDataResponseDto> {
        return this.districtDataService.uploadAndParseExcel(file.buffer);
    }

    @Get()
    @HttpCode(200)
    @ApiResponse({ status: 200, type: DistrictDataResponseDto })
    async getDistrictData(): Promise<DistrictDataResponseDto> {
        return this.districtDataService.getAllDistrictData();
    }
} 