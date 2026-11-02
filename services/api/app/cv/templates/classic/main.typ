// Classic CV template: centred serif header, uppercase section titles over a full-width rule.
// Data arrives as JSON in sys.inputs and is only ever printed, never evaluated as Typst code.

#let cv = json(bytes(sys.inputs.cv))

#set document(title: cv.name + " – CV", author: cv.name)
#set page(paper: "a4", margin: (x: 2cm, top: 1.7cm, bottom: 1.7cm))
// Ligatures and hyphenation are off so CV parsers read "office" and "PostgreSQL" as whole words.
#set text(
  font: "Libertinus Serif", size: 10.5pt, lang: cv.lang, ligatures: false, hyphenate: false,
)
#set par(justify: false, leading: 0.6em, spacing: 0.6em)
#set list(marker: [•], indent: 1pt, body-indent: 0.55em, spacing: 0.5em)

// Each item is a box, so a long address moves to the next line whole instead of breaking in the middle.
#let contact-item(item) = box(if item.url != none { link(item.url, item.text) } else { item.text })
#let joined(parts) = parts.filter(part => part != none).join(", ")

#let section-title(section) = block(
  sticky: true, width: 100%, above: 1.15em, below: 0.65em,
  stroke: (bottom: 0.6pt), inset: (bottom: 0.3em),
  // Letter spacing stays small: from about 0.1em PDF readers split "EXPERIENCE" into "EX P ERI ENCE".
  text(size: 10pt, weight: "semibold", tracking: 0.05em, section.title_upper),
)

#let entry(e) = block(below: 0.8em, {
  block(sticky: true, below: 0.45em, {
    strong(e.title)
    if e.period != none { h(1fr); e.period }
    let detail = joined((e.organization, e.location))
    if detail != none { linebreak(); emph(detail) }
    if e.link != none { linebreak(); link(e.link.url, emph(e.link.text)) }
  })
  if e.bullets.len() > 0 { list(..e.bullets) }
})

#align(center, {
  text(size: 22pt, weight: "semibold", cv.name)
  if cv.headline != none {
    v(0.05em)
    text(size: 11pt, style: "italic", cv.headline)
  }
  // Contact details on one line, web addresses on the next, so neither wraps at an awkward place.
  for items in (cv.contact, cv.links).filter(items => items.len() > 0) {
    linebreak()
    text(size: 9.8pt, items.map(contact-item).join(h(0.55em) + [|] + h(0.55em)))
  }
})

#for section in cv.sections {
  section-title(section)
  if section.kind == "entries" {
    for e in section.entries { entry(e) }
  } else if section.kind == "groups" {
    for group in section.groups {
      block(below: 0.45em, {
        if group.label != none { strong(group.label + ": ") }
        group.text
      })
    }
  } else {
    par(section.text)
  }
}
