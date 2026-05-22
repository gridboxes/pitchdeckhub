export function theme(dark) {
  return {
    bg:          dark ? '#0c0c0c' : '#ffffff',
    surface:     dark ? '#141414' : '#f6f6f6',
    border:      dark ? '#222222' : '#000000',
    borderLight: dark ? '#1e1e1e' : '#e8e8e8',
    text:        dark ? '#f0f0f0' : '#000000',
    muted:       dark ? '#888888' : '#666666',
    faint:       dark ? '#444444' : '#bbbbbb',
    inputBg:     dark ? '#0c0c0c' : '#ffffff',
    inputBorder: dark ? '#222222' : '#000000',
    hoverBg:     dark ? '#141414' : '#f6f6f6',
    accent:      '#F6C347',
    accentFg:    '#000000',
  }
}
