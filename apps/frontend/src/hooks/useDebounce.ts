/**
 * useDebounce - Debounces a value by delaying updates until after delay has passed
 * Commonly used for search inputs to prevent excessive API calls
 */

import { useState, useEffect } from 'react'

/**
 * Custom hook that debounces a value
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns The debounced value
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('')
 * const debouncedSearch = useDebounce(searchTerm, 500)
 * 
 * // Use debouncedSearch in your API calls
 * useEffect(() => {
 *   fetchResults(debouncedSearch)
 * }, [debouncedSearch])
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set up a timer to update the debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clean up the timer if value changes before delay completes
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Custom hook that provides both value and debounced value with setter
 * Useful when you want immediate UI updates but debounced API calls
 * 
 * @param initialValue - The initial value
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns Object with value, debouncedValue, and setValue
 * 
 * @example
 * const { value, debouncedValue, setValue } = useDebouncedState('', 500)
 * 
 * <Input value={value} onChange={(e) => setValue(e.target.value)} />
 * // value updates immediately (for UI)
 * // debouncedValue updates after 500ms (for API calls)
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): {
  value: T
  debouncedValue: T
  setValue: React.Dispatch<React.SetStateAction<T>>
} {
  const [value, setValue] = useState<T>(initialValue)
  const debouncedValue = useDebounce(value, delay)

  return { value, debouncedValue, setValue }
}

export default useDebounce
