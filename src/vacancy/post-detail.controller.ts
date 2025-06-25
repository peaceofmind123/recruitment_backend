import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PostDetailService } from './post-detail.service';

@ApiTags('post-detail')
@Controller('post-detail')
export class PostDetailController {
    constructor(private readonly postDetailService: PostDetailService) { }

    @Get('levels')
    @ApiOperation({ summary: 'Get all levels' })
    async getLevels() {
        return this.postDetailService.getLevels();
    }

    @Get('services')
    @ApiOperation({ summary: 'Get services by level' })
    @ApiQuery({ name: 'level', required: true, type: Number })
    async getServices(@Query('level') level: number) {
        return this.postDetailService.getServices(Number(level));
    }

    @Get('groups')
    @ApiOperation({ summary: 'Get groups by level and service' })
    @ApiQuery({ name: 'level', required: true, type: Number })
    @ApiQuery({ name: 'service', required: true, type: String })
    async getGroups(@Query('level') level: number, @Query('service') service: string) {
        return this.postDetailService.getGroups(Number(level), service);
    }

    @Get('subgroups')
    @ApiOperation({ summary: 'Get subgroups by level, service, and group' })
    @ApiQuery({ name: 'level', required: true, type: Number })
    @ApiQuery({ name: 'service', required: true, type: String })
    @ApiQuery({ name: 'group', required: true, type: String })
    async getSubgroups(
        @Query('level') level: number,
        @Query('service') service: string,
        @Query('group') group: string
    ) {
        return this.postDetailService.getSubgroups(Number(level), service, group);
    }

    @Get('positions')
    @ApiOperation({ summary: 'Get positions by level, service, group, and subgroup' })
    @ApiQuery({ name: 'level', required: true, type: Number })
    @ApiQuery({ name: 'service', required: true, type: String })
    @ApiQuery({ name: 'group', required: true, type: String })
    @ApiQuery({ name: 'subgroup', required: true, type: String })
    async getPositions(
        @Query('level') level: number,
        @Query('service') service: string,
        @Query('group') group: string,
        @Query('subgroup') subgroup: string
    ) {
        return this.postDetailService.getPositions(Number(level), service, group, subgroup);
    }
} 