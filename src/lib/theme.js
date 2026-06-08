export function theme(dark) {
  return {
    bg:          dark ? '#111111' : '#ffffff',
    surface:     dark ? '#1c1c1c' : '#f6f6f6',
    card:        dark ? '#1c1c1c' : '#ffffff',
    border:      dark ? '#2e2e2e' : '#000000',
    borderLight: dark ? '#252525' : '#e8e8e8',
    text:        dark ? '#f0f0f0' : '#000000',
    muted:       dark ? '#9a9a9a' : '#666666',
    faint:       dark ? '#585858' : '#bbbbbb',
    inputBg:     dark ? '#141414' : '#ffffff',
    inputBorder: dark ? '#333333' : '#000000',
    hoverBg:     dark ? '#242424' : '#f6f6f6',
    accent:      '#F6C347',
    accentFg:    '#000000',
  }
}
