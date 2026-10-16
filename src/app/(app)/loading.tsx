export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-white">
      <div className="w-full max-w-7xl p-3 sm:p-6 2xl:max-w-[1680px]">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left side - Form */}
          <div className="col-span-8 w-full space-y-6 lg:col-span-4">
            <div className="h-8 w-full animate-pulse rounded bg-gray-200 lg:w-64" />

            {/* Form fields skeleton */}
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="h-10 animate-pulse rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>

          {/* Right side - PDF Preview */}
          <div className="col-span-8 h-[480px] w-full max-w-full lg:h-[calc(100dvh-14rem)] lg:min-h-[560px]">
            <div className="h-full animate-pulse rounded-lg bg-gray-200">
              <div className="flex items-center justify-between rounded-t-lg bg-gray-300 p-4">
                <div className="h-6 w-full animate-pulse rounded bg-gray-400 lg:w-48" />
                <div className="hidden gap-2 lg:flex">
                  <div className="h-8 w-32 animate-pulse rounded bg-gray-400" />
                  <div className="h-8 w-32 animate-pulse rounded bg-brand-200" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
