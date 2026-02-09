import { Controller, Post, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SurveysService } from './surveys.service';
import { CreateSurveyDto, SubmitSurveyDto } from './dto/survey.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Post()
  async create(@Body() createDto: CreateSurveyDto) {
    return this.surveysService.create(createDto);
  }

  @Get('statistics')
  @UseGuards(JwtAuthGuard)
  async getStatistics() {
    return this.surveysService.getStatistics();
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.surveysService.findOne(+id);
  }

  @Put(':id/submit')
  async submit(@Param('id') id: number, @Body() submitDto: SubmitSurveyDto) {
    return this.surveysService.submitSurvey(+id, submitDto);
  }

  @Get('patient/:patientId')
  @UseGuards(JwtAuthGuard)
  async findByPatient(@Param('patientId') patientId: number) {
    return this.surveysService.findByPatient(+patientId);
  }
}
