export interface IFont {
  normal: {
    [fontWeight: string]: string;
  };
  italic: {
    [fontWeight: string]: string;
  };
}

export interface IFontData {
  [fontName: string]: IFont;
}
