/**
 * Debounced mirror of a ref — used to keep search inputs responsive while
 * the `useFetch` query behind them only refires once typing settles.
 */
export function useDebounced<T>(source: Ref<T>, delay = 300): Readonly<Ref<T>> {
  const debounced = ref(source.value) as Ref<T>
  let timer: ReturnType<typeof setTimeout> | undefined

  watch(source, (value) => {
    clearTimeout(timer)
    timer = setTimeout(() => { debounced.value = value }, delay)
  })

  onScopeDispose(() => clearTimeout(timer))

  return readonly(debounced) as Readonly<Ref<T>>
}
