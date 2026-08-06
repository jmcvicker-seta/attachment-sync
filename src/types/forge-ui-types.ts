/**
 * 🔄 AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * 
 * Forge UI Kit TypeScript Definitions
 * Generated from:
 * - @atlaskit/forge-react-types@1.7.1
 * - @forge/react@11.17.0
 * 
 * Last updated: 2026-06-29T13:09:31.841Z
 * 
 * To regenerate this file, run:
 * `yarn generate:forge-types`
 * 
 * @see https://developer.atlassian.com/platform/forge/ui-kit/
 */


// 🎯 ACTION COMPONENTS
// =============================================================================

/** Valid values for ButtonAppearance */
export type ButtonAppearance = 'danger' | 'default' | 'discovery' | 'primary' | 'subtle' | 'warning';

// From @atlaskit/forge-react-types
export type {
  /** All props: appearance, children, label, testId, titleId */
  ButtonGroupProps,
  /** Required props: children | All props: appearance, autoFocus, children, iconAfter, iconBefore, isDisabled, isSelected, onBlur, onClick, onFocus, shouldFitContainer, spacing, testId */
  ButtonProps,
  /** Required props: children | All props: appearance, autoFocus, children, href, isDisabled, isSelected, onBlur, onClick, onFocus, ref, shouldFitContainer, spacing, testId */
  LinkButtonProps,
  /** Required props: href | All props: children, href, openNewTab */
  LinkProps,
} from '@atlaskit/forge-react-types';

// From @forge/react/out/types
export type {
  /** Required props: children | All props: children */
  ButtonSetProps,
} from '@forge/react/out/types';

// 📝 CONTENT & IMAGE COMPONENTS
// =============================================================================

/** Valid values for CodeLanguages */
export type CodeLanguages = 'abap' | 'actionscript' | 'ada' | 'arduino' | 'autoit' | 'c' | 'c++' | 'coffeescript' | 'csharp' | 'css' | 'cuda' | 'd' | 'dart' | 'delphi' | 'elixir' | 'erlang' | 'fortran' | 'foxpro' | 'go' | 'graphql' | 'groovy' | 'haskell' | 'haxe' | 'html' | 'java' | 'javascript' | 'json' | 'julia' | 'kotlin' | 'latex' | 'livescript' | 'lua' | 'mathematica' | 'matlab' | 'objective-c' | 'objective-j' | 'objectpascal' | 'ocaml' | 'octave' | 'perl' | 'php' | 'powershell' | 'prolog' | 'puppet' | 'python' | 'qml' | 'r' | 'racket' | 'restructuredtext' | 'ruby' | 'rust' | 'sass' | 'scala' | 'scheme' | 'shell' | 'smalltalk' | 'sql' | 'standardml' | 'swift' | 'tcl' | 'tex' | 'text' | 'typescript' | 'vala' | 'vbnet' | 'verilog' | 'vhdl' | 'xml' | 'xquery';
/** Valid values for ImageSizes */
export type ImageSizes = 'large' | 'medium' | 'small' | 'xlarge' | 'xsmall';

// From @atlaskit/forge-react-types
export type {
  /** Required props: document | All props: document, documentWithoutMedia, replaceUnsupportedNode */
  AdfRendererProps,
  /** Required props: glyph | All props: glyph, isBold, label, size, testId */
  AtlassianTileProps,
  /** Required props: text | All props: highlight, highlightedEndText, highlightedStartText, language, shouldWrapLongLines, showLineNumbers, testId, text */
  CodeBlockProps,
  /** All props: children, testId */
  CodeProps,
  /** All props: defaultValue, features, isDisabled, onCancel, onChange, onSave */
  CommentEditorProps,
  /** All props: actions, author, edited, errorActions, time */
  CommentProps,
  /** All props: caption, defaultPage, defaultSortKey, defaultSortOrder, emptyView, head, highlightedRowIndex, isFixedSize, isLoading, isRankable, label, loadingSpinnerSize, onRankEnd, onRankStart, onSetPage, page, paginationi18n, rows, rowsPerPage, sortKey, sortOrder, testId */
  DynamicTableProps,
  /** Required props: resource | All props: dispatch, frameId, height, resource, width */
  FrameProps,
  /** Required props: glyph, label | All props: color, glyph, label, primaryColor, secondaryColor, size */
  IconProps,
  /** Required props: src | All props: alt, height, size, src, width */
  ImageProps,
  TileProps,
} from '@atlaskit/forge-react-types';

// From @forge/react/out/types
export type {
  /** All props: children */
  CellProps,
  /** Required props: children | All props: align, children, width */
  ColumnProps,
  /** Required props: children | All props: children */
  ColumnsProps,
  /** Required props: accountId | All props: accountId */
  MentionProps,
  /** Required props: children | All props: children */
  RowProps,
  /** Required props: children | All props: children, rowsPerPage */
  TableProps,
} from '@forge/react/out/types';

// 💬 FEEDBACK COMPONENTS
// =============================================================================

/** Valid values for StatusLozengeAppearance */
export type StatusLozengeAppearance = 'default' | 'inprogress' | 'moved' | 'new' | 'removed' | 'success';
/** Valid values for TagColor */
export type TagColor = 'blue' | 'blue-light' | 'default' | 'green' | 'green-light' | 'grey' | 'grey-light' | 'purple' | 'purple-light' | 'red' | 'red-light' | 'teal' | 'teal-light' | 'yellow' | 'yellow-light';

// From @atlaskit/forge-react-types
export type {
  /** All props: appearance, children, max, testId */
  BadgeProps,
  /** Required props: header | All props: buttonGroupLabel, description, header, headingLevel, isLoading, primaryAction, secondaryAction, tertiaryAction, testId, width */
  EmptyStateProps,
  /** All props: appearance, children, isBold, maxWidth, testId */
  LozengeProps,
  ProgressBarProps,
  /** Required props: items | All props: animated, items, label, spacing, testId */
  ProgressTrackerProps,
  SectionMessageActionProps,
  SectionMessageProps,
  SpinnerProps,
  TagGroupProps,
  TagProps,
  TooltipProps,
} from '@atlaskit/forge-react-types';

// From @forge/react/out/types
export type {
  /** Required props: value | All props: value */
  DateLozengeProps,
  /** Required props: text | All props: appearance, text */
  StatusLozengeProps,
} from '@forge/react/out/types';

// 🧱 PRIMITIVES COMPONENTS
// =============================================================================

/** Valid values for PressableAppearance */
export type PressableAppearance = 'default' | 'primary' | 'subtle';

// From @atlaskit/forge-react-types
export type {
  /** All props: backgroundColor, children, padding, paddingBlock, paddingBlockEnd, paddingBlockStart, paddingInline, paddingInlineEnd, paddingInlineStart, role, testId, xcss */
  BoxProps,
  FlexProps,
  GridProps,
  /** Required props: editView, onConfirm | All props: editView, onConfirm */
  InlineEditProps,
  InlineProps,
  /** Required props: children | All props: backgroundColor, children, isDisabled, onClick, padding, paddingBlock, paddingBlockEnd, paddingBlockStart, paddingInline, paddingInlineEnd, paddingInlineStart, testId, xcss */
  PressableProps,
  /** Required props: data, xAccessor, yAccessor | All props: colorAccessor, colorPalette, data, height, plotMargin, plotMarginBottom, plotMarginLeft, plotMarginRight, plotMarginTop, showBorder, subtitle, title, width, xAccessor, yAccessor */
  StackBarChartProps,
  StackProps,
} from '@atlaskit/forge-react-types';

// From @forge/react/out/types
export type {
  /** Required props: children | All props: children */
  InlineDialogProps,
} from '@forge/react/out/types';

// 🧭 NAVIGATION COMPONENTS
// =============================================================================

// From @atlaskit/forge-react-types
export type {
  TabListProps,
  TabPanelProps,
  TabProps,
  TabsProps,
} from '@atlaskit/forge-react-types';

// 📱 OVERLAYS COMPONENTS
// =============================================================================

/** Valid values for ModalDialogWidth */
export type ModalDialogWidth = 'large' | 'medium' | 'small' | 'x-large';

// From @atlaskit/forge-react-types
export type {
  ModalBodyProps,
  ModalFooterProps,
  ModalHeaderProps,
  /** All props: height, icon, title, width */
  ModalProps,
  ModalTitleProps,
  ModalTransitionProps,
  /** Required props: content, trigger | All props: boundary, content, trigger */
  PopupProps,
} from '@atlaskit/forge-react-types';

// From @forge/react/out/types
export type {
  /** Required props: children, header, onClose | All props: appearance, children, closeButtonText, header, onClose, width */
  ModalDialogProps,
} from '@forge/react/out/types';

// 📝 SELECTION & INPUT COMPONENTS
// =============================================================================

/** Valid values for TextFieldType */
export type TextFieldType = 'email' | 'number' | 'password' | 'tel' | 'text';

// From @atlaskit/forge-react-types
export type {
  /** All props: day, defaultDay, defaultMonth, defaultPreviouslySelected, defaultSelected, defaultYear, disabled, locale, maxDate, minDate, nextMonthLabel, onBlur, onChange, onFocus, onSelect, previousMonthLabel, previouslySelected, selected, tabIndex, testId, today, weekStartDay, year */
  CalendarProps,
  /** Required props: name, options | All props: defaultValue, isDisabled, name, onChange, options, value */
  CheckboxGroupProps,
  /** All props: aria-invalid, aria-labelledby, defaultChecked, id, isChecked, isDisabled, isIndeterminate, isInvalid, isRequired, label, name, onBlur, onChange, onFocus, testId, value */
  CheckboxProps,
  /** All props: appearance, aria-invalid, aria-labelledby, autoFocus, dateFormat, defaultIsOpen, defaultValue, disabled, id, isDisabled, isInvalid, isOpen, isRequired, locale, maxDate, minDate, name, nextMonthLabel, onBlur, onChange, onFocus, placeholder, previousMonthLabel, selectProps, shouldShowCalendarButton, spacing, testId, value, weekStartDay */
  DatePickerProps,
  /** All props: align */
  FormFooterProps,
  FormHeaderProps,
  /** Required props: children, onSubmit | All props: children, onSubmit */
  FormProps,
  FormSectionProps,
  /** Required props: children, labelFor | All props: children, id, labelFor, testId */
  LabelProps,
  /** Required props: label, value | All props: label, value */
  Option,
  /** All props: onChange */
  RadioGroupProps,
  /** All props: onBlur, onChange, onFocus */
  RadioProps,
  /** All props: aria-invalid, aria-labelledby, defaultValue, id, isDisabled, max, min, name, onBlur, onChange, onFocus, step, testId, value */
  RangeProps,
  /** All props: appearance, autoFocus, closeMenuOnScroll, closeMenuOnSelect, defaultInputValue, defaultMenuIsOpen, defaultValue, id, inputId, inputValue, isClearable, isDisabled, isInvalid, isLoading, isMulti, isRequired, isSearchable, menuIsOpen, name, onBlur, onChange, onFocus, onInputChange, openMenuOnFocus, options, placeholder, spacing, testId, value */
  SelectProps,
  /** All props: onBlur, onChange, onFocus */
  TextAreaProps,
  /** All props: onBlur, onChange, onFocus */
  TextfieldProps,
  /** All props: appearance, aria-invalid, aria-labelledby, autoFocus, defaultIsOpen, defaultValue, hideIcon, id, isDisabled, isInvalid, isOpen, isRequired, label, locale, name, onBlur, onChange, onFocus, placeholder, selectProps, spacing, testId, timeFormat, timeIsEditable, times, value */
  TimePickerProps,
  /** All props: onBlur, onChange, onFocus */
  ToggleProps,
  /** Required props: children | All props: children */
  UserGroupProps,
  /** Required props: label, name | All props: defaultValue, description, isMulti, isRequired, label, name, onChange, placeholder */
  UserPickerProps,
  /** Required props: avatarUrl, email, id, name, type | All props: avatarUrl, email, id, name, type */
  UserPickerValue,
  /** Required props: accountId | All props: accountId, hideDisplayName */
  UserProps,
} from '@atlaskit/forge-react-types';

// From @forge/react/out/types
export type {
  /** Required props: children, is, when | All props: areChildrenPersisted, children, is, when */
  FormConditionProps,
  FormData,
  /** Required props: label, value | All props: defaultSelected, label, value */
  OptionProps,
  /** Required props: label, name | All props: autoComplete, defaultValue, description, isRequired, label, name, placeholder, type */
  TextFieldProps,
} from '@forge/react/out/types';

// ✍️ TYPOGRAPHY COMPONENTS
// =============================================================================

/** Valid values for TextAlign */
export type TextAlign = 'center' | 'end' | 'start';

// From @atlaskit/forge-react-types
export type {
  /** Required props: children | All props: as, children, color, id, size, testId */
  HeadingProps,
  /** Required props: children | All props: children */
  ListItemProps,
  /** Required props: children, type | All props: children, type */
  ListProps,
  /** All props: as */
  TextProps,
} from '@atlaskit/forge-react-types';

// 📊 CHARTS COMPONENTS
// =============================================================================

/** Valid values for ChartColorTokens */
export type ChartColorTokens = 'color.chart.blue.bold' | 'color.chart.blue.bold.hovered' | 'color.chart.blue.bolder' | 'color.chart.blue.bolder.hovered' | 'color.chart.blue.boldest' | 'color.chart.blue.boldest.hovered' | 'color.chart.brand' | 'color.chart.brand.hovered' | 'color.chart.categorical.1' | 'color.chart.categorical.1.hovered' | 'color.chart.categorical.2' | 'color.chart.categorical.2.hovered' | 'color.chart.categorical.3' | 'color.chart.categorical.3.hovered' | 'color.chart.categorical.4' | 'color.chart.categorical.4.hovered' | 'color.chart.categorical.5' | 'color.chart.categorical.5.hovered' | 'color.chart.categorical.6' | 'color.chart.categorical.6.hovered' | 'color.chart.categorical.7' | 'color.chart.categorical.7.hovered' | 'color.chart.categorical.8' | 'color.chart.categorical.8.hovered' | 'color.chart.danger' | 'color.chart.danger.bold' | 'color.chart.danger.bold.hovered' | 'color.chart.danger.hovered' | 'color.chart.discovery' | 'color.chart.discovery.bold' | 'color.chart.discovery.bold.hovered' | 'color.chart.discovery.hovered' | 'color.chart.gray.bold' | 'color.chart.gray.bold.hovered' | 'color.chart.gray.bolder' | 'color.chart.gray.bolder.hovered' | 'color.chart.gray.boldest' | 'color.chart.gray.boldest.hovered' | 'color.chart.green.bold' | 'color.chart.green.bold.hovered' | 'color.chart.green.bolder' | 'color.chart.green.bolder.hovered' | 'color.chart.green.boldest' | 'color.chart.green.boldest.hovered' | 'color.chart.information' | 'color.chart.information.bold' | 'color.chart.information.bold.hovered' | 'color.chart.information.hovered' | 'color.chart.lime.bold' | 'color.chart.lime.bold.hovered' | 'color.chart.lime.bolder' | 'color.chart.lime.bolder.hovered' | 'color.chart.lime.boldest' | 'color.chart.lime.boldest.hovered' | 'color.chart.magenta.bold' | 'color.chart.magenta.bold.hovered' | 'color.chart.magenta.bolder' | 'color.chart.magenta.bolder.hovered' | 'color.chart.magenta.boldest' | 'color.chart.magenta.boldest.hovered' | 'color.chart.neutral' | 'color.chart.neutral.hovered' | 'color.chart.orange.bold' | 'color.chart.orange.bold.hovered' | 'color.chart.orange.bolder' | 'color.chart.orange.bolder.hovered' | 'color.chart.orange.boldest' | 'color.chart.orange.boldest.hovered' | 'color.chart.purple.bold' | 'color.chart.purple.bold.hovered' | 'color.chart.purple.bolder' | 'color.chart.purple.bolder.hovered' | 'color.chart.purple.boldest' | 'color.chart.purple.boldest.hovered' | 'color.chart.red.bold' | 'color.chart.red.bold.hovered' | 'color.chart.red.bolder' | 'color.chart.red.bolder.hovered' | 'color.chart.red.boldest' | 'color.chart.red.boldest.hovered' | 'color.chart.success' | 'color.chart.success.bold' | 'color.chart.success.bold.hovered' | 'color.chart.success.hovered' | 'color.chart.teal.bold' | 'color.chart.teal.bold.hovered' | 'color.chart.teal.bolder' | 'color.chart.teal.bolder.hovered' | 'color.chart.teal.boldest' | 'color.chart.teal.boldest.hovered' | 'color.chart.warning' | 'color.chart.warning.bold' | 'color.chart.warning.bold.hovered' | 'color.chart.warning.hovered' | 'color.chart.yellow.bold' | 'color.chart.yellow.bold.hovered' | 'color.chart.yellow.bolder' | 'color.chart.yellow.bolder.hovered' | 'color.chart.yellow.boldest' | 'color.chart.yellow.boldest.hovered';

// From @atlaskit/forge-react-types
export type {
  /** Required props: data, xAccessor, yAccessor | All props: colorAccessor, colorPalette, data, height, plotMargin, plotMarginBottom, plotMarginLeft, plotMarginRight, plotMarginTop, showBorder, subtitle, title, width, xAccessor, yAccessor */
  BarChartProps,
  /** Required props: colorAccessor, data, labelAccessor, valueAccessor | All props: colorAccessor, colorPalette, data, height, innerRadius, labelAccessor, outerRadius, showBorder, showMarkLabels, subtitle, title, valueAccessor, width */
  DonutChartProps,
  /** Required props: data, xAccessor, yAccessor | All props: colorAccessor, colorPalette, data, height, plotMargin, plotMarginBottom, plotMarginLeft, plotMarginRight, plotMarginTop, showBorder, subtitle, title, width, xAccessor, yAccessor */
  HorizontalBarChartProps,
  /** Required props: data, xAccessor, yAccessor | All props: colorAccessor, colorPalette, data, height, plotMargin, plotMarginBottom, plotMarginLeft, plotMarginRight, plotMarginTop, showBorder, subtitle, title, width, xAccessor, yAccessor */
  HorizontalStackBarChartProps,
  /** Required props: data, xAccessor, yAccessor | All props: colorAccessor, colorPalette, data, height, plotMargin, plotMarginBottom, plotMarginLeft, plotMarginRight, plotMarginTop, showBorder, subtitle, title, width, xAccessor, yAccessor */
  LineChartProps,
  /** Required props: colorAccessor, data, labelAccessor, valueAccessor | All props: colorAccessor, colorPalette, data, height, labelAccessor, showBorder, showMarkLabels, subtitle, title, valueAccessor, width */
  PieChartProps,
} from '@atlaskit/forge-react-types';

// 📦 OTHER COMPONENTS
// =============================================================================

/** Valid values for Align */
export type Align = 'center' | 'end' | 'start';
/** Valid values for Space */
export type Space = 'space.0' | 'space.025' | 'space.050' | 'space.075' | 'space.100' | 'space.1000' | 'space.150' | 'space.200' | 'space.250' | 'space.300' | 'space.400' | 'space.500' | 'space.600' | 'space.800';

// From @atlaskit/forge-react-types
export type {
  /** Required props: glyph | All props: glyph, label, size, testId */
  AtlassianIconProps,
  /** All props: icon */
  BannerProps,
  BlanketProps,
  BleedProps,
  /** All props: iconAfter, iconBefore */
  BreadcrumbsItemProps,
  BreadcrumbsProps,
  /** All props: defaultValue, features, isDisabled, onChange */
  ChromelessEditorProps,
  /** Required props: children | All props: children, testId */
  ErrorMessageProps,
  HelperMessageProps,
  LoadingButtonProps,
  PaginationProps,
  ValidMessageProps,
} from '@atlaskit/forge-react-types';

// From @forge/react/out/types
export type {
  /** Required props: data, isValid | All props: data, isValid */
  CustomPortalFieldValue,
  /** Required props: authUrl | All props: authUrl, message, promptText */
  ThreeLOPromptProps,
} from '@forge/react/out/types';



// 🔧 UTILITY TYPES
// =============================================================================
// Only `export type` re-exports are allowed in this block — see file-generator.ts.

export type { Event } from '@forge/react';
export type { ForgeChildren, ForgeElement, ForgeNode, Icon } from '@forge/react/out/types';



// 📖 QUICK REFERENCE & USAGE EXAMPLES
// =============================================================================

/**
 * 💡 Common Usage Patterns:
 * 
 * Basic component props:
 * ```typescript
 * import { ButtonProps, BoxProps } from '../types';
 * 
 * const MyButton: React.FC<ButtonProps> = (props) => {
 *   return <Button {...props} />;
 * };
 * ```
 * 
 * With custom styling:
 * ```typescript
 * import { BoxProps } from '../types';
 * import { xcss } from '@forge/react';   // runtime helper — import directly, not via the types barrel
 * 
 * const containerStyles = xcss({
 *   padding: 'space.200',
 *   backgroundColor: 'color.background.neutral',
 * });
 * 
 * const MyContainer: React.FC<BoxProps> = (props) => {
 *   return <Box xcss={containerStyles} {...props} />;
 * };
 * ```
 * 
 * Event handling with proper typing:
 * ```typescript
 * import { ButtonProps, Event } from '../types';
 * 
 * const MyButton: React.FC<ButtonProps> = ({ onClick, ...props }) => {
 *   const handleClick = (event: Event) => {
 *     console.log('Button clicked:', event.target.value);
 *     onClick?.(event);
 *   };
 * 
 *   return <Button onClick={handleClick} {...props} />;
 * };
 * ```
 * 
 * Advanced component development:
 * ```typescript
 * import { ForgeElement, Icon } from '../types';
 * 
 * // For building custom components that return ForgeElement
 * const MyCustomComponent = (): ForgeElement => {
 *   return <Text>Custom component</Text>;
 * };
 * 
 * // Icon type for icon props
 * const iconName: Icon = 'check-circle';
 * ```
 * 
 * Available Categories:
 * - 📝 **Content & Image**: 19 types
 * - 📦 **Other**: 16 types
 * - 💬 **Feedback**: 15 types
 * - 🧱 **Primitives**: 10 types
 * - 🎯 **Action**: 6 types
 * - 📝 **Selection & Input**: 27 types
 * - ✍️ **Typography**: 5 types
 * - 📱 **Overlays**: 9 types
 * - 🧭 **Navigation**: 4 types
 * - 📊 **Charts**: 7 types
 * 
 * @see https://developer.atlassian.com/platform/forge/ui-kit/components/
 */

