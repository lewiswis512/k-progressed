import { Controller, Get } from '@nestjs/common';
import { LoadDataService } from './load-data.service';

@Controller('load-data')
export class LoadDataController {
  public constructor(private loadDataService: LoadDataService) {}

  @Get()
  async loadData() {
    return this.loadDataService.loadData();
  }
}
