// Standard CV template: the plain, left-aligned format most career guides describe, set in an Arial-metric font.
// Nothing is right-aligned, so every PDF reader gets the text in the order it is seen: title, then
// organization, place and dates on the next line, then the bullets.
// Data arrives as JSON in sys.inputs and is only ever printed, never evaluated as Typst code.

#let cv = json(bytes(sys.inputs.cv))

#set document(title: cv.name + " – CV", author: cv.name)
#set page(paper: "a4", margin: (x: 2cm, top: 1.7cm, bottom: 1.7cm))
// Ligatures and hyphenation are off so CV parsers read "office" and "PostgreSQL" as whole words.
#set text(font: "Liberation Sans", size: 10pt, lang: cv.lang, ligatures: false, hyphenate: false)
#set par(justify: false, leading: 0.6em, spacing: 0.6em)
#set list(marker: [•], indent: 0pt, body-indent: 0.6em, spacing: 0.5em)

// Each item is a box, so a long address moves to the next line whole instead of breaking in the middle.
#let contact-item(item) = box(if item.url != none { link(item.url, item.text) } else { item.text })
#let separator = [ | ]

#let section-title(section) = block(
  sticky: true, width: 100%, above: 1.25em, below: 0.7em,
  stroke: (bottom: 0.75pt), inset: (bottom: 0.3em),
  text(size: 10.5pt, weight: "bold", section.title_upper),
)

#let entry(e) = block(below: 0.85em, {
  block(sticky: true, below: 0.45em, {
    strong(e.title)
    let link-part = if e.link != none { link(e.link.url, e.link.text) }
    let details = (e.organization, e.location, link-part, e.period).filter(part => part != none)
    if details.len() > 0 { linebreak(); details.join(separator) }
  })
  if e.bullets.len() > 0 { list(..e.bullets) }
})

#block(below: 0.65em, text(size: 20pt, weight: "bold", cv.name))
#if cv.headline != none { block(below: 0.55em, text(size: 11pt, cv.headline)) }
// Contact details on one line, web addresses on the next, so neither wraps at an awkward place.
#for items in (cv.contact, cv.links).filter(items => items.len() > 0) {
  block(below: 0.4em, items.map(contact-item).join(separator))
}

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
