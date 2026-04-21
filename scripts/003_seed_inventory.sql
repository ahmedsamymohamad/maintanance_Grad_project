-- Seed inventory items
INSERT INTO public.inventory_items (name, description, category, compatible_device_types, compatible_brands, quantity, min_quantity, unit_price, supplier, location) VALUES
('HP 67XL Black Ink Cartridge', 'High-yield black ink cartridge for HP printers', 'ink', ARRAY['printer'], ARRAY['HP'], 25, 10, 34.99, 'HP Direct', 'Shelf A1'),
('HP 67XL Color Ink Cartridge', 'High-yield tri-color ink cartridge for HP printers', 'ink', ARRAY['printer'], ARRAY['HP'], 20, 10, 39.99, 'HP Direct', 'Shelf A1'),
('Canon CLI-281 Black Ink', 'Black ink tank for Canon PIXMA printers', 'ink', ARRAY['printer'], ARRAY['Canon'], 15, 5, 19.99, 'Canon USA', 'Shelf A2'),
('Brother TN-760 Toner', 'High-yield toner cartridge for Brother laser printers', 'toner', ARRAY['printer'], ARRAY['Brother'], 12, 5, 79.99, 'Brother Direct', 'Shelf B1'),
('HP CF258X Toner', 'High-yield toner for HP LaserJet Pro', 'toner', ARRAY['printer'], ARRAY['HP'], 8, 4, 129.99, 'HP Direct', 'Shelf B1'),
('Brother DR-730 Drum Unit', 'Drum unit for Brother laser printers', 'drum', ARRAY['printer'], ARRAY['Brother'], 5, 2, 89.99, 'Brother Direct', 'Shelf B2'),
('HP CF232A Imaging Drum', 'Imaging drum for HP LaserJet printers', 'drum', ARRAY['printer'], ARRAY['HP'], 4, 2, 119.99, 'HP Direct', 'Shelf B2'),
('Multi-Purpose Copy Paper A4', '500 sheets, 80gsm white paper', 'paper', ARRAY['printer', 'scanner'], ARRAY['Universal'], 100, 20, 8.99, 'Office Depot', 'Shelf C1'),
('Photo Paper Glossy 4x6', '100 sheets photo paper', 'paper', ARRAY['printer'], ARRAY['Universal'], 50, 10, 14.99, 'Office Depot', 'Shelf C2'),
('Pickup Roller Kit', 'Paper pickup roller replacement kit', 'roller', ARRAY['printer'], ARRAY['HP', 'Canon', 'Brother'], 10, 3, 24.99, 'Parts Direct', 'Shelf D1'),
('Fuser Assembly HP LaserJet', 'Replacement fuser unit for HP LaserJet', 'fuser', ARRAY['printer'], ARRAY['HP'], 3, 2, 149.99, 'HP Direct', 'Shelf D2'),
('Scanner Glass Panel', 'Replacement scanner glass 8.5x11 inch', 'scanner_glass', ARRAY['scanner'], ARRAY['Universal'], 5, 2, 29.99, 'Parts Direct', 'Shelf E1'),
('USB 2.0 Printer Cable 6ft', 'USB A to B printer cable', 'cable', ARRAY['printer', 'scanner'], ARRAY['Universal'], 30, 10, 7.99, 'Amazon', 'Shelf F1'),
('Ethernet Cable Cat6 10ft', 'Network cable for network printers', 'cable', ARRAY['printer', 'scanner'], ARRAY['Universal'], 25, 10, 9.99, 'Amazon', 'Shelf F1'),
('Cleaning Kit for Scanners', 'Microfiber cloths and cleaning solution', 'other', ARRAY['scanner'], ARRAY['Universal'], 20, 5, 12.99, 'Office Depot', 'Shelf G1');
