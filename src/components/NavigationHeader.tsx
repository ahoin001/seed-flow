import { Home, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Link } from "react-router-dom"

interface NavigationHeaderProps {
  title?: string
  showLookupButton?: boolean
}

export function NavigationHeader({ title, showLookupButton = false }: NavigationHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-2">
                <Home className="h-4 w-4" />
                Return to Home
              </Button>
            </Link>
            {showLookupButton && (
              <Link to="/lookup">
                <Button variant="outline" size="sm" className="gap-2">
                  <Search className="h-4 w-4" />
                  Product Lookup
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