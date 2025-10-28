export function Analytics() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Progress Dashboard</h1>
        <p className="text-gray-600">Track your language learning journey with detailed insights and metrics.</p>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 mb-8">
        <select className="px-4 py-2 border border-gray-300 rounded-lg">
          <option>All Languages</option>
        </select>
        <select className="px-4 py-2 border border-gray-300 rounded-lg">
          <option>Last 30 Days</option>
        </select>
        <select className="px-4 py-2 border border-gray-300 rounded-lg">
          <option>All Metrics</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-2">Speaking Rate Trend</h3>
          <div className="text-3xl font-bold text-blue-600 mb-1">150 words/min</div>
          <div className="text-sm text-green-600">+10%</div>
          <div className="text-xs text-gray-500">Last 30 Days</div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-2">Vocabulary Growth</h3>
          <div className="text-3xl font-bold text-green-600 mb-1">500 words</div>
          <div className="text-sm text-green-600">+20%</div>
          <div className="text-xs text-gray-500">Last 30 Days</div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-2">Filler Word Usage</h3>
          <div className="text-3xl font-bold text-red-500 mb-1">10%</div>
          <div className="text-sm text-red-500">-5%</div>
          <div className="text-xs text-gray-500">Last 30 Days</div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-2">Overall Progress</h3>
          <div className="text-3xl font-bold text-blue-600 mb-1">85%</div>
          <div className="text-sm text-green-600">+15%</div>
          <div className="text-xs text-gray-500">Last 30 Days</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Speaking Rate Chart */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Speaking Rate Trend</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <span className="text-gray-500">Line chart visualization</span>
          </div>
        </div>

        {/* Vocabulary Growth Chart */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Vocabulary Growth</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-500 mb-2">Bar chart visualization</div>
              <div className="flex items-center justify-center space-x-2">
                <div className="text-xs text-gray-500">Week 1</div>
                <div className="text-xs text-gray-500">Week 2</div>
                <div className="text-xs text-gray-500">Week 3</div>
                <div className="text-xs text-gray-500">Week 4</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filler Word Usage */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Filler Word Usage</h3>
          <div className="space-y-3">
            {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week, index) => {
              const percentage = Math.max(15 - index * 3, 5)
              return (
                <div key={week} className="flex items-center">
                  <div className="w-16 text-sm text-gray-600">{week}</div>
                  <div className="flex-1 mx-4">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-8 text-sm text-gray-600">{percentage}%</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Overall Progress */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Overall Progress</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">85%</span>
              </div>
              <div className="text-gray-500">Progress circle</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}