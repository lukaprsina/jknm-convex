`6. 7.`
Filtriraj Accordion animacija ne dela

`7. 7.`
diceui in fumadocs za sidebar in TOC
"react-player": "^2.16.0"

uporabi "virtual file routes" za:

- Zgodovina
- Raziskovanje
- Publiciranje
- Varstvo
- Klub

uporabi 5 referralov da dobiš 3.5 GB file storage, 6M function callov na mesec, 6GB file bandwidtha lolll

- ne uporabit Unauthorized pa Authorized, ker med ssr se še nalaga (verjetno gre dvakrat na server po userja)

`8.7.`
[](https://tweakcn.com/editor/theme)

- caffeine
- claude <-

`b2 bucket get --show-size jknm-novice > out.json` -> 956 MB

preberi https://docs.convex.dev/client/react/optimistic
https://mem0.ai/openmemory-mcp

`9.7.`
brez slik: https://www.jknm.site/novica/dolenjski-jamarski-tabor-2024-v-kostanjevici
/media/ je /gradivo/
https://www.matthewluo.com/articles/setting-up-cloudflare-pages-for-convex-deployments
https://blog.cloudflare.com/eliminating-cold-starts-with-cloudflare-workers/
https://developers.cloudflare.com/images/

```
I am making a Slovenian blog with Tanstack Start and Convex. The web article editor is Plate.

#web #plate #default
```

https://developers.cloudflare.com/workers/configuration/secrets/

## Ostalo

```
// to je v serverju, se še nalaga, čeprav imamo user_id
prijava {
  user_id_from_route: 'ks7c6q8jsfnjbm8xh8gdtdas5d7k9ah0',
  convexAuth: { isLoading: true, isAuthenticated: false },
  isServer: true
}
```

https://motion-primitives.com/docs/border-trail

https://originui.com/file-upload
Mixed content w/ card

https://originui.com/dialog
Alert dialog
Search

https://originui.com/input
Input with tags

https://originui.com/table
skombiniraj

- row selection za admina
- sticky header

https://originui.com/timeline
Na dnu je horizontalna

```
I'm sorry you're experiencing issues with the file storage tab in your production deployment dashboard. Based on the knowledge sources, there have been similar reports of problems with file previews and downloads in the dashboard, particularly in production environments. For example, one user reported that the file preview tooltip resulted in a 400 (Bad Request) error, and the Convex team released a fix after being notified. The recommended action in that case was to refresh the dashboard after the fix was deployed, which resolved the issue for the user. If refreshing does not help, it may indicate an ongoing or new bug that needs to be addressed by the Convex team. You can also try clearing your browser cache or using a different browser to rule out local issues.

If the problem persists, it's best to report the issue directly to Convex support, ideally with details such as screenshots, error messages, and steps to reproduce. This will help them investigate and deploy a fix if necessary, as they have done in the past for similar dashboard issues [Prod File Storage preview not working](https://discord.com/channels/1019350475847499849/1372599811622305882).

Currently, the knowledge sources do not provide a workaround for being unable to see or delete files when the dashboard is unresponsive. If you need to delete files programmatically, you can use a mutation with storage.delete, but this requires access to the storage IDs, which may not be possible if the dashboard is not displaying them [Deleting Files](https://docs.convex.dev/file-storage/delete-files).

If you have access to your codebase and can list storage IDs, you could implement a temporary admin mutation to delete files by ID as a workaround.

In summary:
- This is a known type of issue; fixes have been deployed in the past.
- Refreshing the dashboard sometimes helps after a fix.
- If the issue persists, report it to Convex support with details.
- Programmatic deletion is possible if you can access storage IDs.

Let me know if you need an example of how to delete files programmatically.
```
