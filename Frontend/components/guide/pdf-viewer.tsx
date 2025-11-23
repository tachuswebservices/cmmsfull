'use client'

import { useState, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

// CSS for PDF layers
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// ✅ Stable worker import for Next.js
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface PdfViewerProps {
  file: File | string
}

export function PdfViewer({ file }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [searchText, setSearchText] = useState('')
  const [matches, setMatches] = useState<{ pageIndex: number; left: number; top: number; width: number; height: number }[]>([])
  const [currentMatch, setCurrentMatch] = useState(0)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])

  // File load
  useEffect(() => {
    if (file) {
      setSearchText('')
      setMatches([])
      setCurrentMatch(0)
    }
  }, [file])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
  }

  // Search text in PDF
  useEffect(() => {
    if (!searchText) {
      setMatches([])
      setCurrentMatch(0)
      return
    }

    const search = async () => {
      if (!file) return
      const allMatches: { pageIndex: number; left: number; top: number; width: number; height: number }[] = []
      let data: ArrayBuffer
      if (typeof file === 'string') {
        const resp = await fetch(file)
        data = await resp.arrayBuffer()
      } else {
        data = await file.arrayBuffer()
      }
      const pdf = await pdfjs.getDocument({ data }).promise
      for (let i = 0; i < pdf.numPages; i++) {
        const page = await pdf.getPage(i + 1)
        const viewport = page.getViewport({ scale: 1 })
        const textContent = await page.getTextContent()
        
        textContent.items.forEach((item: any) => {
          const text = item.str
          const pageMatches = [...text.matchAll(new RegExp(searchText, 'gi'))]
          pageMatches.forEach(match => {
            allMatches.push({
              pageIndex: i,
              left: item.transform[4],
              top: viewport.height - item.transform[5] - item.height, // Coordinate transformation
              width: item.width,
              height: item.height,
            })
          })
        })
      }
      setMatches(allMatches)
      setCurrentMatch(0)
    }

    const debounceTimeout = setTimeout(search, 500)
    return () => clearTimeout(debounceTimeout)
  }, [searchText, file])

  // Scroll to the current match
  useEffect(() => {
    if (matches.length === 0) return
    const match = matches[currentMatch]
    const pageElement = pageRefs.current[match.pageIndex]
    if (pageElement) {
      pageElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [currentMatch, matches])

  return (
    <div className="w-full h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b gap-4">
        <Input
          placeholder="Search in PDF..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-64"
        />
        {matches.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMatch(prev => Math.max(prev - 1, 0))}
              disabled={currentMatch <= 0}
            >
              <ChevronUp className="h-5 w-5" />
            </Button>
            <span>
              {currentMatch + 1} of {matches.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setCurrentMatch(prev => Math.min(prev + 1, matches.length - 1))
              }
              disabled={currentMatch >= matches.length - 1}
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-black relative">
        {file && (
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            key={typeof file === 'string' ? file : `${file.name}-${file.lastModified}`}
          >
            {Array.from(new Array(numPages), (el, index) => (
              <div 
                key={`page_wrapper_${index + 1}`} 
                ref={(el) => {
                  if (el) {
                    pageRefs.current[index] = el;
                  }
                }} 
                className="relative mb-4"
              >
                <Page
                  pageNumber={index + 1}
                  renderAnnotationLayer={false}
                  renderTextLayer={true}
                />
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                  {matches
                    .filter(match => match.pageIndex === index)
                    .map((match, matchIndex) => (
                      <div
                        key={matchIndex}
                        className={matches.indexOf(match) === currentMatch ? 'current-match' : 'search-match'}
                        style={{
                          position: 'absolute',
                          left: `${match.left}px`,
                          top: `${match.top}px`,
                          width: `${match.width}px`,
                          height: `${match.height}px`,
                          backgroundColor: matches.indexOf(match) === currentMatch ? 'rgba(255, 165, 0, 0.5)' : 'rgba(255, 255, 0, 0.5)',
                        }}
                      />
                    ))}
                </div>
              </div>
            ))}
          </Document>
        )}
      </div>
    </div>
  )
}
