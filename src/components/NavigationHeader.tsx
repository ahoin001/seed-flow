import { Home, Search, Package, AlertTriangle, Globe, Code } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Link } from "react-router-dom"

interface NavigationHeaderProps {
  title?: string
  showLookupButton?: boolean
  showBuildButton?: boolean
  showDuplicatesButton?: boolean
  showAmazonButton?: boolean
  showParserTesterButton?: boolean
}

export function NavigationHeader({ title, showLookupButton = false, showBuildButton = false, showDuplicatesButton = false, showAmazonButton = false, showParserTesterButton = false }: NavigationHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {showBuildButton && (
              <Link to="/">
                <Button variant="outline" size="sm" className="gap-2">
                  <Package className="h-4 w-4" />
                  Build Product
                </Button>
              </Link>
            )}
            {showLookupButton && (
              <Link to="/lookup">
                <Button variant="outline" size="sm" className="gap-2">
                  <Search className="h-4 w-4" />
                  Product Lookup
                </Button>
              </Link>
            )}
            {showDuplicatesButton && (
              <Link to="/duplicates">
                <Button variant="outline" size="sm" className="gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Duplicates
                </Button>
              </Link>
            )}
            {showAmazonButton && (
              <Link to="/amazon-flow">
                <Button variant="outline" size="sm" className="gap-2">
                  <Globe className="h-4 w-4" />
                  Build Product From Amazon
                </Button>
              </Link>
            )}
            {showParserTesterButton && (
              <Link to="/parser-tester">
                <Button variant="outline" size="sm" className="gap-2">
                  <Code className="h-4 w-4" />
                  Parser Tester
                </Button>
              </Link>
            )}
          </div>
          {title && (
            <h1 className="text-lg font-semibold">{title}</h1>
          )}
        </div>
        
        <ThemeToggle />
      </div>
    </header>
  )
}