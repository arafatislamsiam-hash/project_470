import { getPerformanceForecast } from '@/server/controllers/performanceController';

export async function GET() {
  return getPerformanceForecast();
}
