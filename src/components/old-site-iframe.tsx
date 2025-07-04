export function OldSiteIframe({ old_id }: { old_id: number }) {
    return (
        <iframe
            src={`https://www.jknm.si/si/?id=${old_id}`}
            width="100%"
            height="600px"
            sandbox=""
        />
    )
}