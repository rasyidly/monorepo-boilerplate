export function usePrintUrl(url: string): void {
  if (document) {
    const hideFrame = document.createElement('iframe')
    hideFrame.onload = function () {
      const closePrint = () => {
        document.body.removeChild(hideFrame)
      }
      hideFrame.contentWindow?.addEventListener('beforeunload', closePrint)
      hideFrame.contentWindow?.addEventListener('afterprint', closePrint)
      hideFrame.contentWindow?.print()
    }
    hideFrame.style.display = 'none'
    hideFrame.src = url
    document.body.appendChild(hideFrame)
  }
}
