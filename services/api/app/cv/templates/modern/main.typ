// Modern CV template: left-aligned sans header under a deep teal rule, teal sentence-case section titles.
// Data arrives as JSON in sys.inputs and is only ever printed, never evaluated as Typst code.

#let cv = json(bytes(sys.inputs.cv))
#let accent = rgb("#0c4a46")
#let muted = rgb("#4f5861")

#set document(title: cv.name + " – CV", author: cv.name)
#set page(paper: "a4", margin: (x: 1.9cm, top: 1.6cm, bottom: 1.7cm))
// Ligatures and hyphenation are off so CV parsers read "office" and "PostgreSQL" as whole words.
#set text(font: "Fira Sans", size: 9.6pt, lang: cv.lang, ligatures: false, hyphenate: false)
#set par(justify: false, leading: 0.62em, spacing: 0.62em)
#set list(marker: text(fill: accent, [•]), indent: 0pt, body-indent: 0.6em, spacing: 0.55em)

// Each item is a box, so a long address moves to the next line whole instead of breaking in the middle.
#let contact-item(item) = box(if item.url != none { link(item.url, item.text) } else { item.text })
#let joined(parts) = parts.filter(part => part != none).join(", ")

#let section-title(section) = block(
  sticky: true, above: 1.35em, below: 0.7em,
  text(size: 11.5pt, weight: "semibold", fill: accent, section.title),
)

#let entry(e) = block(below: 0.95em, {
  block(sticky: true, below: 0.5em, {
    text(weight: "semibold", e.title)
    if e.period != none { h(1fr); text(fill: muted, e.period) }
    let detail = joined((e.organization, e.location))
    if detail != none { linebreak(); text(fill: muted, detail) }
    if e.link != none { linebreak(); link(e.link.url, text(fill: accent, e.link.text)) }
  })
  if e.bullets.len() > 0 { list(..e.bullets) }
})

#block(below: 0pt, {
  text(size: 25pt, weight: "medium", cv.name)
  if cv.headline != none {
    v(-0.2em)
    text(size: 11.5pt, fill: accent, cv.headline)
  }
  v(0.1em)
  let contact = cv.contact + cv.links
  if contact.len() > 0 { text(size: 9pt, fill: muted, contact.map(contact-item).join(h(1.1em))) }
})
#v(0.5em)
#line(length: 100%, stroke: 1.6pt + accent)

#for section in cv.sections {
  section-title(section)
  if section.kind == "entries" {
    for e in section.entries { entry(e) }
  } else if section.kind == "groups" {
    for group in section.groups {
      block(below: 0.5em, {
        if group.label != none { text(weight: "semibold", group.label + ": ") }
        group.text
      })
    }
  } else {
    par(section.text)
  }
}
