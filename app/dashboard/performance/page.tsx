import Navigation from '@/components/navigation';
import PerformanceOverview from '@/components/performance-overview';
import {
  computePerformanceForecast,
  getTargetsWithProgress
} from '@/lib/performance';
import { getServerSession } from 'next-auth';

export default async function PerformancePage() {
  const session = await getServerSession();

  if (!session) {
    return null;
  }

  const [forecast, targets] = await Promise.all([
    computePerformanceForecast(),
    getTargetsWithProgress()
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <PerformanceOverview
          initialForecast={forecast}
          initialTargets={targets}
        />
      </div>
    </div>
  );
}
