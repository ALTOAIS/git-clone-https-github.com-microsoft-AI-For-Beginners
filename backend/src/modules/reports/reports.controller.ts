import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ReportsService } from './reports.service';

type TableKind =
  'risk-register' | 'action-plan' | 'critical-risks' | 'overdue-actions';

@ApiTags('reports')
@Controller('reports')
@UseGuards(RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':kind/export')
  async export(
    @Param('kind') kind: TableKind,
    @Query('format') format: 'csv' | 'xlsx' = 'csv',
    @Res() res: Response,
  ) {
    if (format === 'xlsx') {
      const buffer = await this.reportsService.exportXlsx(kind);
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${kind}.xlsx"`,
      });
      return res.send(buffer);
    }
    const csv = await this.reportsService.exportCsv(kind);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${kind}.csv"`,
    });
    return res.send(csv);
  }

  @Get('board')
  async board(@Res() res: Response) {
    const buffer = await this.reportsService.boardReportPdf();
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="board-report.pdf"',
    });
    return res.send(buffer);
  }

  @Get('audit-committee')
  async auditCommittee(@Res() res: Response) {
    const buffer = await this.reportsService.auditCommitteeReportPdf();
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition':
        'attachment; filename="audit-committee-report.pdf"',
    });
    return res.send(buffer);
  }

  @Get('compliance')
  async compliance(@Res() res: Response) {
    const buffer = await this.reportsService.complianceReportPdf();
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="compliance-report.pdf"',
    });
    return res.send(buffer);
  }
}
