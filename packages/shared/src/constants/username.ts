// Username validation rules
export const USERNAME_RULES = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 30,
  ALLOWED_CHARS: /^[a-zA-Z0-9_-]+$/,
  RESERVED_WORDS: new Set([
    'admin', 'administrator', 'api', 'app', 'auth', 'auth', 'blog', 'cdn', 'dev', 'development',
    'docs', 'documentation', 'email', 'ftp', 'help', 'home', 'info', 'mail', 'news', 'root',
    'shop', 'store', 'support', 'test', 'testing', 'www', 'lynkby', 'lynk', 'link', 'links',
    'page', 'pages', 'profile', 'profiles', 'user', 'users', 'account', 'accounts', 'dashboard',
    'login', 'logout', 'register', 'signup', 'signin', 'signout', 'password', 'reset', 'verify',
    'confirm', 'activate', 'deactivate', 'delete', 'remove', 'create', 'edit', 'update', 'save',
    'cancel', 'back', 'next', 'previous', 'first', 'last', 'new', 'old', 'public', 'private',
    'secure', 'security', 'safe', 'unsafe', 'valid', 'invalid', 'error', 'errors', 'success',
    'fail', 'failure', 'pending', 'active', 'inactive', 'enabled', 'disabled', 'on', 'off',
    'true', 'false', 'yes', 'no', 'ok', 'okay', 'null', 'undefined', 'empty', 'full', 'complete',
    'incomplete', 'finished', 'unfinished', 'done', 'undone', 'ready', 'notready', 'available',
    'unavailable', 'free', 'busy', 'online', 'offline', 'up', 'down', 'left', 'right', 'top',
    'bottom', 'start', 'end', 'begin', 'finish', 'stop', 'go', 'run', 'walk', 'move', 'stay',
    'wait', 'pause', 'resume', 'continue', 'break', 'restart', 'refresh', 'reload', 'restore',
    'backup', 'sync', 'synchronize', 'connect', 'disconnect', 'join', 'leave', 'enter', 'exit',
    'open', 'close', 'show', 'hide', 'display', 'view', 'see', 'watch', 'look', 'find', 'search',
    'query', 'filter', 'sort', 'order', 'group', 'ungroup', 'merge', 'split', 'combine', 'separate',
    'add', 'remove', 'insert', 'delete', 'update', 'modify', 'change', 'replace', 'swap', 'switch',
    'toggle', 'enable', 'disable', 'activate', 'deactivate', 'turn', 'set', 'get', 'put', 'post',
    'patch', 'head', 'options', 'trace', 'connect', 'get', 'post', 'put', 'delete', 'patch', 'head',
    'options', 'trace', 'connect', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'
  ])
} as const;

// Username validation error messages
export const USERNAME_ERRORS = {
  TOO_SHORT: `Username must be at least ${USERNAME_RULES.MIN_LENGTH} characters long`,
  TOO_LONG: `Username must be no more than ${USERNAME_RULES.MAX_LENGTH} characters long`,
  INVALID_CHARS: 'Username can only contain letters, numbers, underscores, and hyphens',
  RESERVED_WORD: 'This username is reserved and cannot be used',
  ALREADY_TAKEN: 'This username is already taken',
  EMPTY: 'Username is required',
  INVALID_FORMAT: 'Invalid username format'
} as const;
