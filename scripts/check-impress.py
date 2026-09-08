"""Optional Windows integration check; run with LibreOffice's bundled Python.
Requires a dedicated headless UNO listener on 127.0.0.1:2011 and browser-test SVG fixtures.
Never connects to the user's normal LibreOffice profile.
"""
import json
import sys
from pathlib import Path
import uno
from com.sun.star.beans import PropertyValue
from com.sun.star.awt import Point, Size

def prop(name, value):
    p = PropertyValue()
    p.Name, p.Value = name, value
    return p

local = uno.getComponentContext()
resolver = local.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver", local)
context = resolver.resolve("uno:socket,host=127.0.0.1,port=2011;urp;StarOffice.ComponentContext")
manager = context.ServiceManager
desktop = manager.createInstanceWithContext("com.sun.star.frame.Desktop", context)
dispatcher = manager.createInstanceWithContext("com.sun.star.frame.DispatchHelper", context)
provider = manager.createInstanceWithContext("com.sun.star.graphic.GraphicProvider", context)
root = Path("test-results/presentation").resolve()
results = []
keepalive = desktop.loadComponentFromURL("private:factory/sdraw", "_blank", 0, (prop("Hidden", True),))

def inspect(shape):
    result = {"type": shape.ShapeType}
    if hasattr(shape, "getCount"):
        result["children"] = [inspect(shape.getByIndex(i)) for i in range(shape.getCount())]
    if hasattr(shape, "getString"):
        result["text"] = shape.getString()
    return result

for name in (sys.argv[1:] or ["before", "after"]):
    print("Opening Impress: " + name, flush=True)
    doc = desktop.loadComponentFromURL("private:factory/simpress", "_blank", 0, (prop("Hidden", True),))
    try:
        page = doc.getDrawPages().getByIndex(0)
        while page.getCount():
            page.remove(page.getByIndex(0))
        page.Width, page.Height = 28400, 18875
        shape = doc.createInstance("com.sun.star.drawing.GraphicObjectShape")
        print("Loading SVG", flush=True)
        shape.Graphic = provider.queryGraphic((prop("URL", uno.systemPathToFileUrl(str(root / (name + ".svg")))),))
        page.add(shape)
        shape.setSize(Size(25400, 15875))
        shape.setPosition(Point(1500, 1500))
        assert page.getCount() == 1
        shape.setPosition(Point(1600, 1600))
        assert shape.getPosition().X == 1600
        print("Saving import PDF", flush=True)
        doc.storeToURL(uno.systemPathToFileUrl(str(root / (name + "-import.pdf"))), (prop("FilterName", "impress_pdf_Export"), prop("Overwrite", True)))
        doc.getCurrentController().select(shape)
        print("Breaking SVG", flush=True)
        dispatcher.executeDispatch(doc.getCurrentController().getFrame(), ".uno:Break", "", 0, ())
        tree = [inspect(page.getByIndex(i)) for i in range(page.getCount())]
        doc.storeToURL(uno.systemPathToFileUrl(str(root / (name + "-break.pdf"))), (prop("FilterName", "impress_pdf_Export"), prop("Overwrite", True)))
        doc.storeAsURL(uno.systemPathToFileUrl(str(root / (name + "-break.odp"))), (prop("FilterName", "impress8"), prop("Overwrite", True)))
        results.append({"fixture": name, "import_objects": 1, "move_verified": True, "after_break_objects": page.getCount(), "tree": tree})
    finally:
        try:
            doc.close(True)
        except Exception as error:
            print("LibreOffice document closed/disposed: " + str(error), flush=True)
(root / "impress-results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
print(json.dumps([{k:v for k,v in r.items() if k != "tree"} for r in results], indent=2))
try:
    desktop.terminate()
except Exception:
    pass  # Some headless installations exit as soon as the final document closes.
