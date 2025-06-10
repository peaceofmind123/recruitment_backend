import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { QualificationService } from './qualification.service';
import { Qualification } from './entities/qualification.entity';

@ApiTags('qualifications')
@Controller('qualifications')
export class QualificationController {
    constructor(private readonly qualificationService: QualificationService) { }

    @Get()
    @ApiOperation({ summary: 'Get all qualifications' })
    @ApiResponse({
        status: 200,
        description: 'Returns list of all qualifications.',
        type: [Qualification]
    })
    findAll(): Promise<Qualification[]> {
        return this.qualificationService.findAll();
    }
} 