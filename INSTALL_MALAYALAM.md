# IQRA'A Library — പുതുക്കിയ പതിപ്പ്

ഈ പതിപ്പ് jfclearance8-cloud/library-യുടെ upgrade branch-ലാണ്. Google Apps Script backend update/deployment ഇനിയും ആവശ്യമാണ്. Books, Members, Transactions എന്നിവയിലെ നിലവിലുള്ള ഡാറ്റയും കോളങ്ങളുടെ ക്രമവും ഉപയോഗിക്കുന്ന പുതുക്കിയ കോഡാണ് ഈ പാക്കേജ്. നിലവിലുള്ള റെക്കോർഡുകളുടെ migration അല്ലെങ്കിൽ bulk rewrite ഇല്ല.

## Google Apps Script വഴി ഉപയോഗിക്കുക (ആദ്യം ഈ വഴി പരീക്ഷിക്കുക)

1. നിങ്ങളുടെ Google Sheet തുറക്കുക: https://docs.google.com/spreadsheets/d/1NCyiWI_gScUp4x_aoHZq06OF7YHKocRtUiE-UiXl7SU/edit
2. Extensions → Apps Script തുറക്കുക. നിലവിലെ കോഡിന്റെ ഒരു കോപ്പി സൂക്ഷിക്കുക.
3. `Code.gs`-ലെ ഉള്ളടക്കം പാക്കേജിലുള്ള `Code.gs` കൊണ്ട് മാറ്റുക. പഴയ അതേ പേരിലുള്ള functions മറ്റു `.gs` ഫയലുകളിൽ ആവർത്തിച്ച് നിലനിർത്തരുത്.
4. Apps Script-ൽ `Index` എന്ന പേരിൽ HTML ഫയൽ സൃഷ്ടിക്കുക. അതിൽ ഈ പാക്കേജിലുള്ള `index.html`-ന്റെ മുഴുവൻ ഉള്ളടക്കം പേസ്റ്റ് ചെയ്യുക. നിലവിലെ Index ഫയൽ ഉണ്ടെങ്കിൽ അതിൽ മാറ്റുക.
5. Project Settings-ൽ timezone `Asia/Kolkata` ആണെന്ന് ഉറപ്പാക്കുക.
6. Deploy → Manage deployments → Edit → New version → Deploy. പുതിയ deployment ആണെങ്കിൽ Web app തിരഞ്ഞെടുക്കുക; Execute as: Me, ആവശ്യമായ access തിരഞ്ഞെടുക്കുക. ആവശ്യപ്പെട്ടാൽ Google authorization പൂർത്തിയാക്കുക.
7. ലഭിക്കുന്ന `/exec` ലിങ്ക് തുറക്കുക. ഇവിടെ native Google Apps Script connection ഉപയോഗിക്കുന്നതിനാൽ `WEB_APP_URL` മാറ്റേണ്ടതില്ല.
8. Admin തുറന്ന് നിലവിലെ Settings-ലെ Admin Password ഉപയോഗിച്ച് sign in ചെയ്യുക. Settings-ൽ പാസ്‌വേഡ് ശൂന്യമായി വിട്ടാൽ നിലവിലെ പാസ്‌വേഡ് തുടരും. Settings-ൽ password നൽകിയിട്ടില്ലെങ്കിൽ പഴയ fallback `admin123` ആണ്; അത് മാറ്റാം.

## GitHub Pages വഴി ഉപയോഗിക്കുക

ആദ്യം മുകളിൽ പറഞ്ഞ backend code deploy ചെയ്യണം. ശേഷം:

1. `index.html`-ലെ `WEB_APP_URL`-ൽ മുകളിൽ deploy ചെയ്ത അതേ project-ന്റെ `/exec` ലിങ്ക് നൽകുക. ലഭിച്ച source-ലെ പഴയ URL പാക്കേജിൽ നിലനിർത്തിയിട്ടുണ്ട്; അത് നൽകിയ ഷീറ്റിനെയാണ് ഉപയോഗിക്കുന്നതെന്ന് പരിശോധിച്ചിട്ടില്ല.
2. GitHub Pages repository-യിൽ `index.html`, `manifest.json`, `service-worker.js`, `idcon.jpg`, `idcon.png` മാറ്റുക/ചേർക്കുക.
3. പഴയ service worker cache നിലനിൽക്കുന്നുണ്ടെങ്കിൽ browser-ൽ ആ സൈറ്റിന്റെ service worker unregister ചെയ്ത് ഒരിക്കൽ reload ചെയ്യുക. പുതിയ പതിപ്പ് HTML network-first ആയി ലോഡ് ചെയ്യുന്നു; payment/book/member API responses cache ചെയ്യില്ല.
4. `jfclearance8-cloud/library`-യിലെ Pull Request backend deployment പൂർത്തിയാക്കിയ ശേഷം merge ചെയ്യുക.

## പരിഹരിച്ച കാര്യങ്ങൾ

- Bootstrap bundle ഒരിക്കൽ മാത്രം ലോഡ് ചെയ്യുന്നു; modal backdrop മുഴുവനായി നിർബന്ധിച്ച് നീക്കുന്നത് ഒഴിവാക്കി.
- Save പൂർത്തിയായാൽ form button വീണ്ടും പ്രവർത്തിക്കും; books/students പട്ടികയും dashboard-വും പുതുക്കും.
- save request നടക്കുമ്പോൾ അതേ form വീണ്ടും submit ചെയ്യുന്നത് തടയും.
- sessionStorage-ൽ server-issued token സൂക്ഷിക്കുന്നു; അതേ tab refresh ചെയ്താലും വീണ്ടും password നൽകേണ്ടതില്ല. പരമാവധി ആറുമണിക്കൂർ; Google cache token നേരത്തെ ഒഴിവാക്കിയാൽ വീണ്ടും login വേണം. Lock Session ഉപയോഗിച്ചാൽ token റദ്ദാകും.
- Admin password browser-ലേക്ക് അയയ്ക്കാതെ server-ൽ പരിശോധിക്കുന്നു. writes-ന് session നിർബന്ധമാണ്.
- Duplicate Book ID/Student ID തടയുന്നു. leading zeros ഉള്ള പുതിയ ID-കൾ text ആയി സൂക്ഷിക്കുന്നു.
- save/update failure വിജയമായി കാണിക്കില്ല; errors ദൃശ്യമാകും.
- write operations lock ഉപയോഗിക്കുന്നു; ഒരേ സമയം നടക്കുന്ന updates തമ്മിലുള്ള സംഘർഷം കുറയ്ക്കുന്നു.
- Delete-ന് confirmation ഉണ്ട്. ഇടപാട് ചരിത്രമുള്ള ബുക്കുകൾ/വിദ്യാർത്ഥികളെ ഡിലീറ്റ് ചെയ്യാനാവില്ല. Transactions/history ഡിലീറ്റ് ചെയ്യുന്നില്ല. ചരിത്രമില്ലാത്ത തിരഞ്ഞെടുക്കുന്ന റെക്കോർഡ് മാത്രം ഡിലീറ്റ് ചെയ്യും.
- issued copies-നെക്കാൾ കുറഞ്ഞ total copies നൽകുന്ന invalid update തടയും.
- `dd/MM/yyyy` തീയതികൾ ശരിയായി വായിക്കുന്നു; transaction ID-കൾ UUID ഉപയോഗിക്കുന്നു.
- ബുക്കിലും വിദ്യാർത്ഥികളുടെ പേരിലും apostrophe/HTML characters ഉണ്ടായാലും edit/history buttons തകരില്ല.
- PDF export പരാജയപ്പെട്ടാലും page-ന്റെ styles/buttons പുനഃസ്ഥാപിക്കും.
- desktop full-width layout, mobile spacing, touch-friendly controls, scrollable tables, visible keyboard focus, reduced-motion support.

## ആദ്യ പരീക്ഷണം

യഥാർത്ഥ ഡാറ്റയിൽ പുതിയ test records ചേർക്കുന്നതിനു പകരം ആദ്യം Sheet-ന്റെ കോപ്പിയിൽ കോഡ് പരീക്ഷിക്കുന്നത് സൗകര്യപ്രദമാണ്. തുടർച്ചയായി രണ്ട് ബുക്കുകളും രണ്ട് വിദ്യാർത്ഥികളും ചേർക്കുക; ഓരോ തവണയും modal അടയുന്നുണ്ടോ, പട്ടിക പുതുക്കുന്നുണ്ടോ പരിശോധിക്കുക. refresh ചെയ്ത് Admin session തുടരുന്നുണ്ടോ നോക്കുക. പുതിയ ചരിത്രമില്ലാത്ത test record delete ചെയ്യുക. ഒരു book issue/return ചെയ്ത് history ഉണ്ടെങ്കിൽ delete തടയുന്നുണ്ടോ പരിശോധിക്കുക.

## പരിശോധനയുടെ പരിധി

JavaScript syntax പരിശോധനയും simulated Google Apps Script services ഉപയോഗിച്ച backend പരിശോധനയും നടത്തി. DOM integration പരീക്ഷണം repeated saves, error recovery, modal cleanup, quoted names, delete, session restoration എന്നിവ പരിശോധിക്കുന്നു. Live Google deployment-ൽ writes നടത്തിയിട്ടില്ല. Chromium browser download പരാജയപ്പെട്ടതിനാൽ actual desktop/mobile screenshots, real-browser responsive layout, real Google authorization/CORS, PDF rendering എന്നിവ ഈ അന്തരീക്ഷത്തിൽ പരിശോധിച്ചിട്ടില്ല. അവ deployment കഴിഞ്ഞ് പരിശോധിക്കണം. എല്ലാ ബഗുകളും ഇല്ലാതായി എന്ന ഉറപ്പ് ഇതിൽ നിന്ന് നൽകാനാവില്ല.

External fonts, Bootstrap, SweetAlert, PDF export library എന്നിവയ്ക്ക് internet ആവശ്യമാണ്. നിലവിലുള്ള logo പാക്കേജിൽ ഉൾപ്പെടുത്തിയിട്ടുണ്ട്; native Apps Script mode-ൽ അതേ GitHub logo URL ഉപയോഗിക്കുന്നു.
