/**
 * External dependencies
 */
import React, { Component, PropTypes } from 'react';
import { flowRight, get } from 'lodash';
import { connect } from 'react-redux';
import { localize } from 'i18n-calypso';

/**
 * Internal dependencies
 */
import ButtonsAppearance from './appearance';
import ButtonsOptions from './options';
import QueryJetpackModules from 'components/data/query-jetpack-modules';
import QuerySiteSettings from 'components/data/query-site-settings';
import QuerySharingButtons from 'components/data/query-sharing-buttons';
import { saveSiteSettings } from 'state/site-settings/actions';
import { saveSharingButtons } from 'state/sites/sharing-buttons/actions';
import { getSelectedSiteId } from 'state/ui/selectors';
import { getSiteSettings, isSavingSiteSettings, isSiteSettingsSaveSuccessful } from 'state/site-settings/selectors';
import { getSharingButtons, isSavingSharingButtons, isSharingButtonsSaveSuccessful } from 'state/selectors';
import { isJetpackSite } from 'state/sites/selectors';
import { isJetpackModuleActive } from 'state/selectors';
import { recordGoogleEvent } from 'state/analytics/actions';
import { successNotice, errorNotice } from 'state/notices/actions';
import { activateModule, fetchModuleList } from 'state/jetpack/modules/actions';
import { protectForm } from 'lib/protect-form';

class SharingButtons extends Component {
	state = {
		values: {},
		buttonsPendingSave: null
	};

	static propTypes = {
		buttons: PropTypes.array,
		isSaving: PropTypes.bool,
		isSaveSettingsSuccessful: PropTypes.bool,
		isSaveButtonsSuccessful: PropTypes.bool,
		markSaved: PropTypes.func,
		markChanged: PropTypes.func,
		settings: PropTypes.object,
		siteId: PropTypes.number,
		translate: PropTypes.func,
	};

	saveChanges = event => {
		const {
			isJetpack,
			isLikesModuleActive,
			siteId
		} = this.props;

		event.preventDefault();

		this.props.saveSiteSettings( this.props.siteId, this.state.values );
		if ( this.state.buttonsPendingSave ) {
			this.props.saveSharingButtons( this.props.siteId, this.state.buttonsPendingSave );
		}
		this.props.recordGoogleEvent( 'Sharing', 'Clicked Save Changes Button' );

		if ( ! isJetpack || isLikesModuleActive !== false ) {
			return;
		}

		const currentLikesSettingValue = get( this.props, [ 'settings', 'disabled_likes' ] );
		const isLikesButtonEnabled = get( this.state, [ 'values', 'disabled_likes' ], currentLikesSettingValue ) === false;
		if ( ! isLikesButtonEnabled ) {
			return;
		}

		this.props.activateModule( siteId, 'likes', true )
			.then( () => this.props.fetchModuleList( siteId ) );
	};

	handleChange = ( option, value ) => {
		const pairs = undefined === value
			? option
			: { [ option ]: value };
		this.props.markChanged();
		this.setState( {
			values: Object.assign( {}, this.state.values, pairs )
		} );
	};

	handleButtonsChange = buttons => {
		this.props.markChanged();
		this.setState( { buttonsPendingSave: buttons } );
	};

	componentWillReceiveProps( nextProps ) {
		// Save request has been performed
		if (
			this.props.isSaving &&
			! nextProps.isSaving
		) {
			if (
				nextProps.isSaveSettingsSuccessful &&
				( nextProps.isSaveButtonsSuccessful || ! this.state.buttonsPendingSave )
			) {
				nextProps.successNotice( nextProps.translate( 'Settings saved successfully!' ) );
				nextProps.markSaved();
				this.setState( {
					values: {},
					buttonsPendingSave: null
				} );
			} else {
				nextProps.errorNotice( nextProps.translate( 'There was a problem saving your changes. Please, try again.' ) );
			}
		}
	}

	render() {
		const {
			buttons,
			isJetpack,
			isSaving,
			settings,
			siteId
		} = this.props;
		const updatedSettings = Object.assign( {}, settings, this.state.values );
		const updatedButtons = this.state.buttonsPendingSave || buttons;

		return (
			<form onSubmit={ this.saveChanges } id="sharing-buttons" className="sharing-settings sharing-buttons">
				<QuerySiteSettings siteId={ siteId } />
				<QuerySharingButtons siteId={ siteId } />
				{ isJetpack && <QueryJetpackModules siteId={ siteId } /> }
				<ButtonsAppearance
					buttons={ updatedButtons }
					values={ updatedSettings }
					onChange={ this.handleChange }
					onButtonsChange={ this.handleButtonsChange }
					initialized={ !! buttons && !! settings }
					saving={ isSaving } />
				<ButtonsOptions
					settings={ updatedSettings }
					onChange={ this.handleChange }
					saving={ isSaving } />
			</form>
		);
	}
}

const connectComponent = connect(
	state => {
		const siteId = getSelectedSiteId( state );
		const settings = getSiteSettings( state, siteId );
		const buttons = getSharingButtons( state, siteId );
		const isJetpack = isJetpackSite( state, siteId );
		const isLikesModuleActive = isJetpackModuleActive( state, siteId, 'likes' );
		const isSavingSettings = isSavingSiteSettings( state, siteId );
		const isSavingButtons = isSavingSharingButtons( state, siteId );
		const isSaveSettingsSuccessful = isSiteSettingsSaveSuccessful( state, siteId );
		const isSaveButtonsSuccessful = isSharingButtonsSaveSuccessful( state, siteId );

		return {
			isJetpack,
			isLikesModuleActive,
			isSaving: isSavingSettings || isSavingButtons,
			isSaveSettingsSuccessful,
			isSaveButtonsSuccessful,
			settings,
			buttons,
			siteId
		};
	},
	{
		activateModule,
		errorNotice,
		fetchModuleList,
		recordGoogleEvent,
		saveSharingButtons,
		saveSiteSettings,
		successNotice
	}
);

export default flowRight(
	connectComponent,
	protectForm,
	localize,
)( SharingButtons );
