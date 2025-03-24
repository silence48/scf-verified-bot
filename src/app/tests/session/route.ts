import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  console.log("calling session in the session test");
  const session = await auth();
  console.log("called session in the session test");
  if (session) {
    return NextResponse.json(session);
  } else {
    return NextResponse.json({ error: "No session found" }, { status: 404 });
  }
}

/*


{"userAgent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
"version":"1.4.1","focusAreaImgTabindex":false,"focusAreaTabindex":false,"focusAreaWithoutHref":false,
"focusAudioWithoutControls":false,"focusBrokenImageMap":true,"focusChildrenOfFocusableFlexbox":false,
"focusFieldsetDisabled":true,"focusFieldset":false,"focusFlexboxContainer":false,"focusFormDisabled":true,
"focusImgIsmap":false,"focusImgUsemapTabindex":true,"focusInHiddenIframe":true,"focusInvalidTabindex":false,
"focusLabelTabindex":true,"focusObjectSvg":true,"focusObjectSvgHidden":false,"focusRedirectImgUsemap":false,
"focusRedirectLegend":"","focusScrollBody":false,"focusScrollContainerWithoutOverflow":false,"focusScrollContainer":false,
"focusSummary":true,"focusSvgFocusableAttribute":false,"focusSvgTabindexAttribute":true,
"focusSvgNegativeTabindexAttribute":true,"focusSvgUseTabindex":true,"focusSvgForeignobjectTabindex":true,"focusSvg":false,
"focusTabindexTrailingCharacters":true,"focusTable":false,"focusVideoWithoutControls":false,
"cssShadowPiercingDeepCombinator":"","focusInZeroDimensionObject":true,"focusObjectSwf":true,"focusSvgInIframe":false,
"tabsequenceAreaAtImgPosition":false,"time":"2025-01-07T03:39:39.323Z"}
*/
