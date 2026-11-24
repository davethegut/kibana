/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';

export type DemoModelTier = 'efficient' | 'balanced' | 'frontier';
export interface DemoModelTierConfig {
  useRecommended: boolean;
  modelIds: string[];
}
export type DemoModelAssignments = Record<DemoModelTier, DemoModelTierConfig>;
interface SampleModel {
  id: string;
  name: string;
  provider: string;
}
const sampleModels: readonly SampleModel[] = [
  { id: 'gpt6luna', name: 'GPT-6 Luna', provider: 'OpenAI' },
  { id: 'gemini35flashlite', name: 'Gemini 3.5 Flash Lite', provider: 'Google' },
  { id: 'claude45haiku', name: 'Claude Haiku 4.5', provider: 'Anthropic' },
  { id: 'claude55sonnet', name: 'Claude Sonnet 5.5', provider: 'Anthropic' },
  { id: 'gpt56terra', name: 'GPT-5.6 Terra', provider: 'OpenAI' },
  { id: 'gemini36flash', name: 'Gemini 3.6 Flash', provider: 'Google' },
  { id: 'gpt6sol', name: 'GPT-6 Sol', provider: 'OpenAI' },
  { id: 'gpt56sol', name: 'GPT-5.6 Sol', provider: 'OpenAI' },
  { id: 'claude5opus', name: 'Claude Opus 5', provider: 'Anthropic' },
];
const copy = {
  sample: i18n.translate('xpack.alertzero.poc.modelPicker.sample', {
    defaultMessage: 'Illustrative model assignments. No model connections are changed.',
  }),
  efficient: i18n.translate('xpack.alertzero.poc.modelPicker.efficient', {
    defaultMessage: 'Efficient models',
  }),
  efficientSummary: i18n.translate('xpack.alertzero.poc.modelPicker.efficientSummary', {
    defaultMessage: 'Quick, frequent checks',
  }),
  efficientDescription: i18n.translate('xpack.alertzero.poc.modelPicker.efficientDescription', {
    defaultMessage:
      'Lightweight work that runs often, such as checking detection coverage. Use a small, low-cost model.',
  }),
  balanced: i18n.translate('xpack.alertzero.poc.modelPicker.balanced', {
    defaultMessage: 'Balanced models',
  }),
  balancedSummary: i18n.translate('xpack.alertzero.poc.modelPicker.balancedSummary', {
    defaultMessage: 'Accurate, everyday analysis',
  }),
  balancedDescription: i18n.translate('xpack.alertzero.poc.modelPicker.balancedDescription', {
    defaultMessage:
      'Work that runs frequently or uses tools over several steps, such as alert analysis or diagnosing a noisy rule. Use a strong mid-size model.',
  }),
  frontier: i18n.translate('xpack.alertzero.poc.modelPicker.frontier', {
    defaultMessage: 'Frontier models',
  }),
  frontierSummary: i18n.translate('xpack.alertzero.poc.modelPicker.frontierSummary', {
    defaultMessage: 'Complex reasoning and rule creation',
  }),
  frontierDescription: i18n.translate('xpack.alertzero.poc.modelPicker.frontierDescription', {
    defaultMessage:
      'Complex work where the quality of the result matters most, such as generating attack discoveries or drafting a detection rule. Use your most capable model.',
  }),
  recommended: i18n.translate('xpack.alertzero.poc.modelPicker.recommended', {
    defaultMessage: 'Recommended',
  }),
  custom: i18n.translate('xpack.alertzero.poc.modelPicker.custom', { defaultMessage: 'Custom' }),
  useRecommended: i18n.translate('xpack.alertzero.poc.modelPicker.useRecommended', {
    defaultMessage: 'Use recommended defaults',
  }),
  assigned: i18n.translate('xpack.alertzero.poc.modelPicker.assigned', {
    defaultMessage: 'Assigned models',
  }),
  fallbackHelp: i18n.translate('xpack.alertzero.poc.modelPicker.fallbackHelp', {
    defaultMessage:
      'Models are tried in order. Later models provide a fallback if an earlier one is unavailable.',
  }),
  primary: i18n.translate('xpack.alertzero.poc.modelPicker.primary', { defaultMessage: 'Primary' }),
  add: i18n.translate('xpack.alertzero.poc.modelPicker.add', { defaultMessage: 'Add a model' }),
  search: i18n.translate('xpack.alertzero.poc.modelPicker.search', {
    defaultMessage: 'Search models...',
  }),
};
const tiers: ReadonlyArray<{
  id: DemoModelTier;
  label: string;
  summary: string;
  description: string;
  recommended: readonly string[];
}> = [
  {
    id: 'efficient',
    label: copy.efficient,
    summary: copy.efficientSummary,
    description: copy.efficientDescription,
    recommended: ['gpt6luna', 'gemini35flashlite', 'claude45haiku'],
  },
  {
    id: 'balanced',
    label: copy.balanced,
    summary: copy.balancedSummary,
    description: copy.balancedDescription,
    recommended: ['claude55sonnet', 'gpt56terra', 'gemini36flash'],
  },
  {
    id: 'frontier',
    label: copy.frontier,
    summary: copy.frontierSummary,
    description: copy.frontierDescription,
    recommended: ['gpt6sol', 'gpt56sol', 'claude5opus'],
  },
];
const modelName = (id: string): string => sampleModels.find((model) => model.id === id)?.name ?? id;

/** Returns the display name of the first sample model assigned to a tier. */
export const getDemoPrimaryModelName = ({ modelIds }: DemoModelTierConfig): string =>
  modelIds.length > 0 ? modelName(modelIds[0]) : '';

/** Returns fresh sample defaults matching AlertZero's three registered model tiers. */
export const createDefaultDemoModelAssignments = (): DemoModelAssignments => ({
  efficient: { useRecommended: true, modelIds: [...tiers[0].recommended] },
  balanced: { useRecommended: true, modelIds: [...tiers[1].recommended] },
  frontier: { useRecommended: true, modelIds: [...tiers[2].recommended] },
});

const AddSampleModel: React.FC<{
  tier: DemoModelTier;
  tierLabel: string;
  selectedIds: readonly string[];
  onAdd: (id: string) => void;
}> = ({ tier, tierLabel, selectedIds, onAdd }) => {
  const [isOpen, setIsOpen] = useState(false);
  const options = useMemo<EuiSelectableOption[]>(
    () =>
      sampleModels
        .filter(({ id }) => !selectedIds.includes(id))
        .map(({ id, name, provider }) => ({
          key: id,
          label: name,
          prepend: <EuiIcon type="processor" size="s" aria-hidden />,
          append: (
            <EuiText size="xs" color="subdued">
              {provider}
            </EuiText>
          ),
          'data-test-subj': `alertZeroPocModelOption-${id}`,
        })),
    [selectedIds]
  );
  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="s"
      aria-label={i18n.translate('xpack.alertzero.poc.modelPicker.selectionLabel', {
        defaultMessage: 'Choose a model for {tier}',
        values: { tier: tierLabel },
      })}
      button={
        <EuiButtonEmpty
          size="s"
          color="text"
          iconType="plusCircle"
          isDisabled={options.length === 0}
          data-test-subj={`alertZeroPocModelAdd-${tier}`}
          onClick={() => setIsOpen((current) => !current)}
        >
          {copy.add}
        </EuiButtonEmpty>
      }
    >
      {isOpen ? (
        <EuiSelectable
          searchable
          singleSelection
          options={options}
          height={280}
          searchProps={{
            placeholder: copy.search,
            'aria-label': i18n.translate('xpack.alertzero.poc.modelPicker.searchLabel', {
              defaultMessage: 'Search models for {tier}',
              values: { tier: tierLabel },
            }),
          }}
          listProps={{ bordered: false, showIcons: false }}
          onChange={(next) => {
            const selected = next.find((option) => option.checked === 'on');
            if (selected?.key) {
              onAdd(selected.key);
              setIsOpen(false);
            }
          }}
        >
          {(list, search) => (
            <>
              {search}
              {list}
            </>
          )}
        </EuiSelectable>
      ) : null}
    </EuiPopover>
  );
};

const ModelAction: React.FC<
  React.ComponentProps<typeof EuiButtonIcon> & { 'aria-label': string }
> = (props) => (
  <EuiToolTip content={props['aria-label']} disableScreenReaderOutput>
    <EuiButtonIcon {...props} />
  </EuiToolTip>
);

const ModelTier: React.FC<{
  tier: (typeof tiers)[number];
  value: DemoModelTierConfig;
  onChange: (next: DemoModelTierConfig) => void;
}> = ({ tier, value, onChange }) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: `alertZeroPocModelTier-${tier.id}` });
  const firstModel = value.modelIds[0];
  const fallbackCount = Math.max(0, value.modelIds.length - 1);
  const moveModel = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= value.modelIds.length) return;
    const nextIds = [...value.modelIds];
    [nextIds[index], nextIds[destination]] = [nextIds[destination], nextIds[index]];
    onChange({ ...value, modelIds: nextIds });
  };
  return (
    <div
      data-test-subj={`alertZeroPocModelTier-${tier.id}`}
      css={css`
        padding: ${euiTheme.size.base} 0;
      `}
    >
      <EuiAccordion
        id={accordionId}
        paddingSize="none"
        buttonProps={{ 'data-test-subj': `alertZeroPocModelTierToggle-${tier.id}` }}
        buttonContent={
          <div
            css={css`
              text-align: start;
            `}
          >
            <EuiText size="s">
              <strong>{tier.label}</strong>
            </EuiText>
            <EuiText size="xs" color="subdued">
              {tier.summary}
            </EuiText>
          </div>
        }
        extraAction={
          <EuiFlexGroup
            responsive={false}
            alignItems="center"
            gutterSize="s"
            wrap
            justifyContent="flexEnd"
          >
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <span>{firstModel ? modelName(firstModel) : copy.assigned}</span>
              </EuiText>
              {fallbackCount > 0 ? (
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.alertzero.poc.modelPicker.fallbackCount', {
                    defaultMessage:
                      '+ {count} {count, plural, one {fallback model} other {fallback models}}',
                    values: { count: fallbackCount },
                  })}
                </EuiText>
              ) : null}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={value.useRecommended ? 'hollow' : 'primary'}>
                {value.useRecommended ? copy.recommended : copy.custom}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <EuiSpacer size="m" />
        <EuiText size="s" color="subdued">
          <p>{tier.description}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiSwitch
          compressed
          label={copy.useRecommended}
          aria-label={i18n.translate('xpack.alertzero.poc.modelPicker.recommendedLabel', {
            defaultMessage: 'Use recommended defaults for {tier}',
            values: { tier: tier.label },
          })}
          checked={value.useRecommended}
          data-test-subj={`alertZeroPocModelRecommended-${tier.id}`}
          onChange={({ target }) =>
            onChange({
              useRecommended: target.checked,
              modelIds: target.checked ? [...tier.recommended] : [...value.modelIds],
            })
          }
        />
        <EuiSpacer size="m" />
        <EuiText size="xs" color="subdued">
          <strong>{copy.assigned}</strong>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiPanel hasBorder hasShadow={false} paddingSize="s">
          {value.modelIds.map((id, index) => (
            <React.Fragment key={id}>
              {index > 0 ? <EuiHorizontalRule margin="s" /> : null}
              <EuiFlexGroup
                responsive={false}
                alignItems="center"
                gutterSize="s"
                data-test-subj={`alertZeroPocModelRow-${tier.id}-${id}`}
              >
                <EuiFlexItem grow={false}>
                  <EuiIcon type="processor" size="m" aria-hidden />
                </EuiFlexItem>
                <EuiFlexItem
                  css={css`
                    min-inline-size: 0;
                    overflow-wrap: anywhere;
                  `}
                >
                  <EuiText size="s">
                    <span>{modelName(id)}</span>
                  </EuiText>
                </EuiFlexItem>
                {value.useRecommended ? (
                  index === 0 ? (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">{copy.primary}</EuiBadge>
                    </EuiFlexItem>
                  ) : null
                ) : (
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="none" responsive={false}>
                      <ModelAction
                        size="s"
                        color="text"
                        iconType="chevronSingleUp"
                        isDisabled={index === 0}
                        data-test-subj={`alertZeroPocModelMoveUp-${tier.id}-${id}`}
                        aria-label={i18n.translate('xpack.alertzero.poc.modelPicker.moveUp', {
                          defaultMessage: 'Move {model} earlier for {tier}',
                          values: { model: modelName(id), tier: tier.label },
                        })}
                        onClick={() => moveModel(index, -1)}
                      />
                      <ModelAction
                        size="s"
                        color="text"
                        iconType="chevronSingleDown"
                        isDisabled={index === value.modelIds.length - 1}
                        data-test-subj={`alertZeroPocModelMoveDown-${tier.id}-${id}`}
                        aria-label={i18n.translate('xpack.alertzero.poc.modelPicker.moveDown', {
                          defaultMessage: 'Move {model} later for {tier}',
                          values: { model: modelName(id), tier: tier.label },
                        })}
                        onClick={() => moveModel(index, 1)}
                      />
                      <ModelAction
                        size="s"
                        color="text"
                        iconType="cross"
                        isDisabled={value.modelIds.length <= 1}
                        data-test-subj={`alertZeroPocModelRemove-${tier.id}-${id}`}
                        aria-label={i18n.translate('xpack.alertzero.poc.modelPicker.remove', {
                          defaultMessage: 'Remove {model} from {tier}',
                          values: { model: modelName(id), tier: tier.label },
                        })}
                        onClick={() =>
                          onChange({
                            ...value,
                            modelIds: value.modelIds.filter((selectedId) => selectedId !== id),
                          })
                        }
                      />
                    </EuiFlexGroup>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </React.Fragment>
          ))}
        </EuiPanel>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          <p>{copy.fallbackHelp}</p>
        </EuiText>
        {!value.useRecommended ? (
          <>
            <EuiSpacer size="s" />
            <AddSampleModel
              tier={tier.id}
              tierLabel={tier.label}
              selectedIds={value.modelIds}
              onAdd={(id) => {
                if (!value.modelIds.includes(id))
                  onChange({ ...value, modelIds: [...value.modelIds, id] });
              }}
            />
          </>
        ) : null}
      </EuiAccordion>
    </div>
  );
};

/** A controlled, sample-only adaptation of the native feature-settings model tiers. */
export const DemoModelPicker: React.FC<{
  value: DemoModelAssignments;
  onChange: (next: DemoModelAssignments) => void;
}> = ({ value, onChange }) => (
  <>
    {tiers.map((tier, index) => (
      <React.Fragment key={tier.id}>
        {index > 0 ? <EuiHorizontalRule margin="none" /> : null}
        <ModelTier
          tier={tier}
          value={value[tier.id]}
          onChange={(next) => onChange({ ...value, [tier.id]: next })}
        />
      </React.Fragment>
    ))}
    <EuiSpacer size="s" />
    <EuiText size="xs" color="subdued">
      <p>{copy.sample}</p>
    </EuiText>
  </>
);
