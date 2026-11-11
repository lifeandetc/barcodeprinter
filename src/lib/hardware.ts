export const PHYSICAL_CHECKS = [
  { id: "dymo-software", label: "Install and open DYMO Connect on this Mac.", requiresHardware: true },
  { id: "printer", label: "Connect the LabelWriter 450 Turbo and confirm it appears in the printer list.", requiresHardware: true },
  { id: "stock", label: "Measure your purchased labels and save that width and height.", requiresHardware: true },
  { id: "calibration", label: "Print the calibration page at 100% scale and measure the 10 mm line.", requiresHardware: true },
  { id: "scan", label: "Scan one sample at Square checkout and record whether the item and price match.", requiresHardware: true },
];
