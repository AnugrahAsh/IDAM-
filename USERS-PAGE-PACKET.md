# Tanflow IDAM — Users Page Integration

The Users page works as a self-contained page module that plugs into the existing IDAM console through `DirectoryPage.jsx`.

It reads its user dataset, permissions, attribute schema, and posture data from the existing `data/` and configuration stores. The directory components handle filtering, identity details, forms, password reset, uploads, and selection state.

## Integration

Copy the supplied `idam/` files into their exact existing paths.

Keep the existing `App.jsx` route because `users` already points to `DirectoryPage`.

The page depends on the shared styles in `src/styles/`, particularly `components.css` and `workbench.css`. These styles need to be present for the Users page to render correctly. If the existing versions have been customized, diff them rather than overwriting them blindly.