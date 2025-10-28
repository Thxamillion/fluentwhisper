import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, HelpCircle } from 'lucide-react'

export function Import() {
  const queueItems = [
    { title: 'The Little Prince', status: 'Queued', progress: 0 },
    { title: 'The Alchemist', status: 'Parsing', progress: 50 },
    { title: 'One Hundred Years of Solitude', status: 'Completed', progress: 100 },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Import</h1>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-8">
        <Button variant="default" className="bg-blue-600 hover:bg-blue-700">Files</Button>
        <Button variant="ghost">Paste Text</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* File Upload Area */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-8">
              <div className="border-2 border-dashed border-muted rounded-lg p-12 text-center">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Drag and drop files here</h3>
                <p className="text-muted-foreground mb-4">Or click to browse</p>
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Browse Files
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Parsing Options */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Parsing Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="block text-sm font-medium mb-2">Language</label>
                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Auto-detect" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Queue & Preview */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Queue & Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Table Headers */}
                <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground">
                  <div>ITEM</div>
                  <div>STATUS</div>
                  <div>PROGRESS</div>
                  <div></div>
                </div>

                {/* Queue Items */}
                {queueItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 items-center py-2">
                    <div className="font-medium">{item.title}</div>
                    <div>
                      <Badge
                        variant={
                          item.status === 'Completed' ? 'default' :
                          item.status === 'Parsing' ? 'secondary' :
                          'outline'
                        }
                        className={
                          item.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          item.status === 'Parsing' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">{item.progress}%</span>
                    </div>
                    <div>
                      <Button variant="link" size="sm" className="text-blue-600">
                        Preview
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Help Panel */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <CardTitle>Help</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-blue-600 mb-2">Supported Types:</h4>
                <p className="text-sm text-muted-foreground">
                  We support PDF, EPUB, TXT, and DOCX files.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-blue-600 mb-2">Limits:</h4>
                <p className="text-sm text-muted-foreground">
                  There is a 100MB size limit per file.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}