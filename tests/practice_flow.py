"""Production UI regression checks. Run pnpm build, then use Python with Playwright and Chrome."""

import json
import mimetypes
import re
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright


DIST = Path(__file__).resolve().parents[1] / "dist"
ROOT = "http://localhost"
SESSION = "signlens_session_v5_FSL"


def serve(route):
    path = DIST / (urlsplit(route.request.url).path.lstrip("/") or "index.html")
    if not path.is_file():
        route.fulfill(status=404)
        return
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    route.fulfill(path=path, content_type=mime)


def check_flow(page):
    def button(name):
        return page.get_by_role("button", name=name, exact=True)

    def lesson(name):
        page.get_by_role("button", name=re.compile(name)).click()

    def reference(clip):
        video = page.locator("#practice-reference video")
        expect(video).to_have_attribute("src", f"/sign-videos/fsl105/{clip}.mov")
        expect(video).to_have_js_property("loop", True)
        video.dispatch_event("ended")
        expect(video).to_have_attribute("src", f"/sign-videos/fsl105/{clip}.mov")

    page.goto(ROOT)
    page.evaluate("""() => localStorage.setItem('signlens_course_v1_FSL', JSON.stringify({
      'unit-1-greetings/u1-n1': {stars: 2, best: 92, completedAt: '2026-11-18'}
    }))""")
    page.reload()
    lesson("Time of Day")
    reference(0)
    button("Finish self-review").click()
    reference(4)
    page.reload()
    reference(4)

    for size, visible in [((600, 800), True), ((1200, 540), True), ((1200, 800), False)]:
        page.set_viewport_size(dict(zip(("width", "height"), size)))
        notice = page.get_by_text("SignLens needs more space", exact=False)
        if visible:
            expect(notice).to_be_visible()
            assert page.locator("main").evaluate("(m) => m.scrollWidth <= m.clientWidth + 1")
        else:
            expect(notice).to_be_hidden()
        reference(4)

    button("Leave practice").click()
    lesson("Kamusta & Replies")
    reference(4)
    button("Finish self-review").click()
    button("Continue").click()
    reference(5)
    button("Leave practice").click()
    lesson("Time of Day")
    reference(4)
    button("Skip").click()
    button("Continue").click()
    reference(1)
    for sentence in [[1, 4, 7], [2, 3, 9], [0, 4, 5]]:
        for clip in sentence:
            reference(clip)
            button("Finish self-review").click()
        if sentence[-1] != 5:
            button("Continue").click()
    expect(page.get_by_text("Lesson Complete!", exact=True)).to_be_visible()
    assert page.evaluate("localStorage.getItem('signlens_progress_v1')") is None
    assert page.evaluate("localStorage.getItem('signlens_telemetry_csv_v1')") is None
    button("Continue Learning").click()
    lesson("Kamusta & Replies")
    reference(5)
    button("Leave practice").click()
    button("Dictionary").click()
    page.get_by_role("tab", name="Numbers").click()
    expect(page.locator(".sl-dictionary-matches")).to_contain_text("Digit 10")
    page.get_by_role("tab", name="Letters").click()
    button("Letter A").click()
    page.get_by_role("tab", name="Saved (0)").click()
    expect(page.locator(".sl-entry")).to_have_count(0)
    page.get_by_role("tab", name=re.compile("^All")).click()
    page.get_by_role("searchbox").fill("Hello")
    button("Practice").click()
    reference(3)
    button("Finish self-review").click()
    button("Continue Learning").click()
    button("Practice").click()
    reference(3)
    button("Leave practice").click()
    button("Hot coffee, no sugar").click()
    preview = page.locator(".sl-phrase-builder video")
    expect(preview).to_have_attribute("src", "/sign-videos/fsl105/95.mov")
    preview.dispatch_event("ended")
    expect(preview).to_have_attribute("src", "/sign-videos/fsl105/99.mov")
    button("Practice Phrase").click()
    reference(95)
    button("Finish self-review").click()
    reference(99)
    button("Leave practice").click()
    expect(page.get_by_role("heading", name="Dictionary", exact=True)).to_be_visible()
    assert json.loads(page.evaluate("(key) => localStorage.getItem(key)", SESSION))["source"]["kind"] == "phrase"


if __name__ == "__main__":
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="chrome")
        page = browser.new_page(viewport={"width": 1200, "height": 800})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.add_init_script("""navigator.mediaDevices.getUserMedia = async () => {
          throw new DOMException('Camera unavailable in this test', 'NotFoundError')
        }""")
        page.route(ROOT + "/**", serve)
        check_flow(page)
        assert not errors, errors
        print("Passed sentence playback, retry, resume, resize, scoring, filters, replay and phrase preview.")
